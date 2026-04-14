import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, Observable, ReplaySubject, Subject, switchMap, timer} from 'rxjs';
import {Competitor, CurrentHeatModel} from '../model/current-heat.model';
import {ConnectionState, State} from '../model/state.model';
import {ImportService} from './import.service';
import {TimingStateService} from './timing-state.service';

@Injectable({
  providedIn: 'root'
})
export class AlgeService {
  private messageSubject = new ReplaySubject<string>();
  public message = this.messageSubject.asObservable();

  private udpActiveSubject = new ReplaySubject<boolean>();
  public udpActive = this.udpActiveSubject.asObservable();

  public currentHeat: Observable<CurrentHeatModel>;

  public state: Observable<State>;

  private algeStateSubject = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  public algeState = this.algeStateSubject.asObservable();

  private pingSubject = new Subject<void>();

  constructor(
    private importService: ImportService,
    private timingStateService: TimingStateService,
    private ngZone: NgZone
  ) {
    this.currentHeat = this.timingStateService.currentHeat;
    this.state = this.timingStateService.state;
    this.setupTimeoutCheck();
    this.setupIpcSync();
  }

  sendMessage(msg: string) {
    this.messageSubject.next(msg);
  }

  processUdpMessage(msg: string) {
    this.receivePing();

    msg = msg.replaceAll("\r", "")
    let fields = msg.split("\t");

    let shouldEmitHeat = false; // Track if we need to emit the heat update

    switch (fields[0]) {
      case "Time":
        if (fields[2] === "RunningTime") {
          this.timingStateService.mutateCurrentHeat(heat => {
            heat.runningTime = Number(fields[3]);
          });
          if (this.timingStateService.stateValue != State.RUNNING && +fields[3] >= 0) {
            this.ngZone.run(() => {
              this.timingStateService.setState(State.RUNNING);
            });
            this.timingStateService.currentHeatValue.competitors.forEach(c => {c.splits = new Map<number, number>(); c.lapM = 0;})

            this.importService.startHeat(this.timingStateService.currentHeatValue.event, this.timingStateService.currentHeatValue.heat);
            shouldEmitHeat = true;
          }
          if (+fields[3] <= -1) {
            this.ngZone.run(() => {
              this.timingStateService.setState(State.NOT_RUNNING);
            });
          }
          shouldEmitHeat = true;
        }

        if (fields[2] === "Ready" && this.timingStateService.stateValue != State.READY) {
          this.ngZone.run(() => {
            this.timingStateService.setState(State.READY);
          });
          this.timingStateService.currentHeatValue.competitors.forEach(c => {c.first_name = ""; c.last_name = ""; c.team = ""; c.lap = 0; c.lapM = 0; c.splits = new Map<number, number>();})

          this.importService.stopHeat(this.timingStateService.currentHeatValue.event, this.timingStateService.currentHeatValue.heat);
          shouldEmitHeat = true;
        }

        if (fields[2] === "LaneTime" && +fields[3] > 0) {
          let lane = Number(fields[1]);
          let c = this.getOrCreateCompetitor(lane);
          c.lap = Number(fields[7]);
          c.lapM = Number(fields[9].split(".")[0]);
          c.splits.set(c.lapM, Number(fields[3]));

          this.importService.laneTime(lane, Number(fields[3]), c.lapM, c.lap === this.timingStateService.currentHeatValue.laps);
          shouldEmitHeat = true;
        }
        break;
      case "Event":
        if (fields[1] === "EventName") {
          this.timingStateService.mutateCurrentHeat(heat => {
            heat.event = Number(fields[2]);
          });
          shouldEmitHeat = true;
        }
        if (fields[1] === "Discipline") {
          this.timingStateService.mutateCurrentHeat(heat => {
            heat.style = fields[2];
          });
          shouldEmitHeat = true;
        }
        break;
      case "Heat":
        if (fields[1] === "HeatNumber") {
          this.timingStateService.mutateCurrentHeat(heat => {
            heat.heat = Number(fields[2]);
          });
          shouldEmitHeat = true;
        }
        if (fields[1] === "DistanceM") {
          this.timingStateService.mutateCurrentHeat(heat => {
            heat.distance = Number(fields[2]);
          });
          shouldEmitHeat = true;
        }
        if (fields[1] === "Laps") {
          this.timingStateService.mutateCurrentHeat(heat => {
            heat.laps = Number(fields[2]);
          });
          shouldEmitHeat = true;
        }
        break;
      case "Meet":
        break;
      case "Competitor":
          let lane = Number(fields[1]);
          let c = this.getOrCreateCompetitor(lane);
          switch (fields[2]) {
            case "FirstName":
              c.first_name = fields[3];
              shouldEmitHeat = true;
              break
            case "LastName":
              c.last_name = fields[3];
              shouldEmitHeat = true;
              break
            case "TeamName":
              if (fields[3].length > 0) {
                c.team = fields[3];
                shouldEmitHeat = true;
              }
              break
            case "ClubName":
              if (fields[3].length > 0) {
                c.team = fields[3];
                shouldEmitHeat = true;
              }
              break
          }
        break;

    }

    // Emit the heat update after all modifications to trigger change detection
    if (shouldEmitHeat) {
      this.ngZone.run(() => {
        this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
      });
    }
  }

  getOrCreateCompetitor(lane: number): Competitor {
    return this.timingStateService.getOrCreateCompetitor(lane);
  }

  receivePing() {
    this.ngZone.run(() => {
      this.algeStateSubject.next(ConnectionState.CONNECTED);
    });
    this.pingSubject.next();
  }

  setUdpActive(active: boolean) {
    this.ngZone.run(() => {
      this.udpActiveSubject.next(active);
    });
  }

  setCurrentHeat(runningHeat: CurrentHeatModel) {
    this.ngZone.run(() => {
      this.timingStateService.setCurrentHeat(runningHeat);
    });
  }

  private setupTimeoutCheck() {
    this.pingSubject.pipe(
      // Reset the timer on every ping
      switchMap(() => timer(1000)) // 1 second timeout
    ).subscribe(() => {
      // No ping received for 1 second
      this.ngZone.run(() => {
        this.algeStateSubject.next(ConnectionState.DISCONNECTED);
      });
    });
  }

  // IPC Synchronization - NEW REQUEST-RESPONSE PATTERN
  // Only listen for state change notifications and query the main process for data

  private setupIpcSync() {
    if (!this.isElectron()) {
      return;
    }

    const ipcRenderer = this.getIpcRenderer();
    if (!ipcRenderer) {
      return;
    }

    // OUTGOING: Send state updates to main process (for initial sync only)
    this.currentHeat.subscribe(heat => {
      this.sendStateUpdateToMain('alge:update-current-heat', this.serializeHeat(heat), ipcRenderer);
    });

    this.state.subscribe(state => {
      this.sendStateUpdateToMain('alge:update-state', state, ipcRenderer);
    });

    this.algeState.subscribe(algeState => {
      this.sendStateUpdateToMain('alge:update-alge-state', algeState, ipcRenderer);
    });

    this.udpActive.subscribe(active => {
      this.sendStateUpdateToMain('alge:update-udp-active', active, ipcRenderer);
    });

    // INCOMING: Listen for state change notifications from main process
    // When state changes, query the main process for the latest data
    ipcRenderer.on('alge:state-changed:heat', async () => {
      console.log('[AlgeService] Heat changed notification, querying main process');
      try {
        const latestHeat = await ipcRenderer.invoke('alge:get-current-heat');
        this.ngZone.run(() => {
          this.timingStateService.setCurrentHeat(this.deserializeHeat(latestHeat));
        });
      } catch (error) {
        console.error('[AlgeService] Error fetching latest heat:', error);
      }
    });

    ipcRenderer.on('alge:state-changed:state', (event: any, state: any) => {
      console.log('[AlgeService] State changed:', state);
      this.ngZone.run(() => {
        this.timingStateService.setState(state);
      });
    });

    ipcRenderer.on('alge:state-changed:alge-state', (event: any, algeState: any) => {
      console.log('[AlgeService] Alge state changed:', algeState);
      this.ngZone.run(() => {
        this.algeStateSubject.next(algeState);
      });
    });

    ipcRenderer.on('alge:state-changed:udp-active', (event: any, active: any) => {
      console.log('[AlgeService] UDP active changed:', active);
      this.ngZone.run(() => {
        this.udpActiveSubject.next(active);
      });
    });

    // Fetch initial state from main process on startup
    // This ensures secondary windows (like display window) get current state immediately
    this.fetchInitialStateFromMain(ipcRenderer);
  }

  private async fetchInitialStateFromMain(ipcRenderer: any) {
    try {
      console.log('[AlgeService] Fetching initial state from main process');
      const [initialHeat, initialState, initialAlgeState, initialUdpActive] = await Promise.all([
        ipcRenderer.invoke('alge:get-current-heat'),
        ipcRenderer.invoke('alge:get-state'),
        ipcRenderer.invoke('alge:get-alge-state'),
        ipcRenderer.invoke('alge:get-udp-active')
      ]);

      // Run all state updates inside NgZone to trigger change detection
      this.ngZone.run(() => {
          if (initialHeat && Object.keys(initialHeat).length > 0) {
            this.timingStateService.setCurrentHeat(this.deserializeHeat(initialHeat));
        }
        if (initialState) {
            this.timingStateService.setState(initialState);
        }
        if (initialAlgeState) {
          this.algeStateSubject.next(initialAlgeState);
        }
        if (initialUdpActive !== undefined) {
          this.udpActiveSubject.next(initialUdpActive);
        }
      });

      console.log('[AlgeService] Initial state fetched from main process');
    } catch (error) {
      console.warn('[AlgeService] Error fetching initial state:', error);
    }
  }

  private isElectron(): boolean {
    return !!(window && (window as any).process && (window as any).process.type);
  }

  private getIpcRenderer(): any {
    try {
      if (this.isElectron()) {
        return (window as any).require('electron').ipcRenderer;
      }
    } catch (error) {
      console.warn('[AlgeService] Could not get ipcRenderer:', error);
    }
    return null;
  }

  private sendStateUpdateToMain(channel: string, data: any, ipcRenderer: any) {
    if (!ipcRenderer) {
      return;
    }
    try {
      ipcRenderer.send(channel, data);
    } catch (error) {
      console.error('[AlgeService] Error sending state update:', error);
    }
  }

  private serializeHeat(heat: CurrentHeatModel): any {
    return {
      event: heat.event,
      heat: heat.heat,
      distance: heat.distance,
      laps: heat.laps,
      style: heat.style,
      runningTime: heat.runningTime,
      competitors: Array.from(heat.competitors.entries()).map(([lane, competitor]) => ({
        lane,
        first_name: competitor.first_name,
        last_name: competitor.last_name,
        team: competitor.team,
        lap: competitor.lap,
        lapM: competitor.lapM,
        year: competitor.year,
        splits: Array.from(competitor.splits.entries())
      }))
    };
  }

  private deserializeHeat(data: any): CurrentHeatModel {
    const competitors = new Map<number, Competitor>();

    if (data.competitors && Array.isArray(data.competitors)) {
      data.competitors.forEach((comp: any) => {
        const splits = new Map<number, number>(comp.splits || []);
        competitors.set(comp.lane, {
          lane: comp.lane,
          first_name: comp.first_name,
          last_name: comp.last_name,
          team: comp.team,
          lap: comp.lap,
          lapM: comp.lapM,
          year: comp.year,
          splits: splits
        } as Competitor);
      });
    }

    return {
      event: data.event,
      heat: data.heat,
      distance: data.distance,
      laps: data.laps,
      style: data.style,
      runningTime: data.runningTime,
      competitors: competitors
    } as CurrentHeatModel;
  }
}


