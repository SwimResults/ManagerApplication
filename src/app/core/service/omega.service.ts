import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, Observable, ReplaySubject, Subject, Subscription, switchMap, timer} from 'rxjs';
import {CurrentHeatModel} from '../model/current-heat.model';
import {ConnectionState, State} from '../model/state.model';
import {ImportService} from './import.service';
import {SerialComService, SerialConnectionStatus, SerialMessage, SerialPortConfig, SerialPortInfo} from './serial-com.service';
import {TimingStateService} from './timing-state.service';

interface OSM6Part1Frame {
  messageType: string;
  timeKind: string;
  timeType: string;
  event: number;
  heat: number;
  lapNumber: number;
  rank: number;
}

interface OSM6Part2Frame {
  lane: number;
  lap: number;
  time: number;
}

type OSM6Frame =
  | {kind: 'heartbeat'}
  | {kind: 'part1'; frame: OSM6Part1Frame}
  | {kind: 'part2'; frame: OSM6Part2Frame};

@Injectable({
  providedIn: 'root'
})
export class OmegaService {
  private messageSubject = new ReplaySubject<string>();
  message = this.messageSubject.asObservable();

  private omegaStateSubject = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  omegaState = this.omegaStateSubject.asObservable();

  private serialActiveSubject = new BehaviorSubject<boolean>(false);
  serialActive = this.serialActiveSubject.asObservable();

  serialStatus!: Observable<SerialConnectionStatus>;

  currentHeat!: Observable<CurrentHeatModel>;
  state!: Observable<State>;

  private pingSubject = new Subject<void>();
  private pendingPart1: OSM6Part1Frame | null = null;
  private pendingFinishAfterPart2 = false;

  private serialStatusSubscription: Subscription;
  private serialMessageSubscription: Subscription;

  constructor(
    private importService: ImportService,
    private serialComService: SerialComService,
    private timingStateService: TimingStateService,
    private ngZone: NgZone
  ) {
    this.serialStatus = this.serialComService.status;
    this.currentHeat = this.timingStateService.currentHeat;
    this.state = this.timingStateService.state;
    this.setupTimeoutCheck();
    this.serialStatusSubscription = this.serialComService.status.subscribe(status => {
      this.ngZone.run(() => {
        this.serialActiveSubject.next(status.isListening);
        if (status.error) {
          this.omegaStateSubject.next(ConnectionState.ERROR);
        } else if (!status.isListening) {
          this.omegaStateSubject.next(ConnectionState.DISCONNECTED);
        }
      });
    });

    this.serialMessageSubscription = this.serialComService.messages.subscribe(message => {
      this.processSerialMessage(message);
    });
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    return this.serialComService.listPorts();
  }

  async startListening(config: SerialPortConfig) {
    const result = await this.serialComService.startListening(config);
    if (!result.success && result.error) {
      this.messageSubject.next(`Serial start failed: ${result.error}`);
    }
    return result;
  }

  async stopListening() {
    const result = await this.serialComService.stopListening();
    if (!result.success && result.error) {
      this.messageSubject.next(`Serial stop failed: ${result.error}`);
    }
    return result;
  }

  setCurrentHeat(runningHeat: CurrentHeatModel) {
    this.timingStateService.setCurrentHeat(runningHeat);
  }

  setState(state: State) {
    this.timingStateService.setState(state);
  }

  private processSerialMessage(message: SerialMessage) {
    const bytes = Array.isArray(message.bytes) ? message.bytes : [];
    if (bytes.length === 0) {
      return;
    }

    this.receivePing();

    const frame = this.decodeFrame(bytes);
    if (!frame) {
      this.messageSubject.next(`OMEGA: Unparsed frame (${message.byteLength} bytes)`);
      return;
    }

    switch (frame.kind) {
      case 'heartbeat':
        this.messageSubject.next('OMEGA: heartbeat');
        break;
      case 'part1':
        this.pendingPart1 = frame.frame;
        this.pendingFinishAfterPart2 = this.isFinishFrame(frame.frame);
        this.applyHeatMetadata(frame.frame);
        this.messageSubject.next(`OMEGA: heat ${frame.frame.event}/${frame.frame.heat} (${frame.frame.messageType}/${frame.frame.timeKind})`);

        if (this.isStartFrame(frame.frame)) {
          this.beginHeat();
        }
        break;
      case 'part2':
        this.handlePart2Frame(frame.frame);
        break;
    }
  }

  private handlePart2Frame(frame: OSM6Part2Frame) {
    const part1 = this.pendingPart1;
    if (!part1) {
      this.messageSubject.next(`OMEGA: lane ${frame.lane} time without pending header`);
      return;
    }

    this.applyHeatMetadata(part1);

    const competitor = this.timingStateService.getOrCreateCompetitor(frame.lane);
    competitor.lap = frame.lap;
    competitor.lapM = frame.lap;
    competitor.splits.set(frame.lap, frame.time);

    const done = this.isFinishFrame(part1);
    this.importService.laneTime(frame.lane, frame.time, frame.lap, done);
    this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
    this.messageSubject.next(`OMEGA: lane ${frame.lane}, lap ${frame.lap}, time ${frame.time}${done ? ' (final)' : ''}`);
    this.pendingPart1 = null;

    if (this.pendingFinishAfterPart2) {
      this.finishHeat();
      this.pendingFinishAfterPart2 = false;
    }
  }

  private applyHeatMetadata(frame: OSM6Part1Frame) {
    this.timingStateService.mutateCurrentHeat(heat => {
      heat.event = frame.event;
      heat.heat = frame.heat;
      if (frame.lapNumber > 0) {
        heat.laps = frame.lapNumber;
      }
    });
  }

  private beginHeat() {
    if (this.timingStateService.stateValue === State.RUNNING) {
      return;
    }

    this.pendingFinishAfterPart2 = false;
    this.timingStateService.setState(State.RUNNING);
    this.timingStateService.currentHeatValue.competitors.forEach(competitor => {
      competitor.splits = new Map<number, number>();
      competitor.lap = 0;
      competitor.lapM = 0;
    });
    this.importService.startHeat(this.timingStateService.currentHeatValue.event, this.timingStateService.currentHeatValue.heat);
    this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
  }

  private finishHeat() {
    if (this.timingStateService.stateValue === State.READY) {
      return;
    }

    this.timingStateService.setState(State.READY);
    this.timingStateService.currentHeatValue.competitors.forEach(competitor => {
      competitor.splits = new Map<number, number>();
      competitor.lap = 0;
      competitor.lapM = 0;
    });
    this.importService.stopHeat(this.timingStateService.currentHeatValue.event, this.timingStateService.currentHeatValue.heat);
    this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
  }

  private isStartFrame(frame: OSM6Part1Frame): boolean {
    return frame.messageType === '2' || frame.timeKind === 'S';
  }

  private isFinishFrame(frame: OSM6Part1Frame): boolean {
    return frame.messageType === '1' || frame.timeKind === 'A' || frame.timeKind === 'B';
  }

  private decodeFrame(bytes: number[]): OSM6Frame | null {
    if (this.isHeartbeatFrame(bytes)) {
      return {kind: 'heartbeat'};
    }

    if (bytes.length < 4 || bytes[0] !== 0x01 || bytes[bytes.length - 1] !== 0x04) {
      return null;
    }

    const text = this.bytesToText(bytes)
      .replace(/[\u0001\u0002\u0004\u0008\u000a\u0010\u0012\u0014\s]/g, '');

    if (!text) {
      return null;
    }

    if (text.includes(':')) {
      const part2 = this.parsePart2(text);
      return part2 ? {kind: 'part2', frame: part2} : null;
    }

    const part1 = this.parsePart1(text);
    return part1 ? {kind: 'part1', frame: part1} : null;
  }

  private parsePart1(text: string): OSM6Part1Frame | null {
    const normalized = text.slice(0, 14);
    if (normalized.length < 14) {
      return null;
    }

    return {
      messageType: normalized.charAt(0),
      timeKind: normalized.charAt(1),
      timeType: normalized.charAt(2),
      event: Number(normalized.slice(7, 10)),
      heat: Number(normalized.slice(10, 12)),
      lapNumber: Number(normalized.slice(5, 7)),
      rank: Number(normalized.slice(12, 14))
    };
  }

  private parsePart2(text: string): OSM6Part2Frame | null {
    let laneLength = 1;
    if (text.startsWith('10')) {
      laneLength = 2;
    }

    const lane = Number(text.slice(0, laneLength));
    const lap = Number(text.slice(laneLength, laneLength + 2));
    const timeText = text.slice(laneLength + 2);
    const time = this.parseOsm6Time(timeText);

    if (!Number.isFinite(lane) || !Number.isFinite(lap) || !Number.isFinite(time)) {
      return null;
    }

    return {lane, lap, time};
  }

  private parseOsm6Time(timeText: string): number {
    const trimmed = timeText.trim();
    if (!trimmed) {
      return NaN;
    }

    const segments = trimmed.split(':');
    if (segments.length < 2 || segments.length > 3) {
      return NaN;
    }

    let hours = 0;
    let minutes = 0;
    let secondsPart = '';

    if (segments.length === 3) {
      hours = Number(segments[0]);
      minutes = Number(segments[1]);
      secondsPart = segments[2];
    } else {
      minutes = Number(segments[0]);
      secondsPart = segments[1];
    }

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return NaN;
    }

    const [secondsText, fractionText = '0'] = secondsPart.split(/[.,]/);
    const seconds = Number(secondsText);
    if (!Number.isFinite(seconds)) {
      return NaN;
    }

    const fractionMs = Number(fractionText.padEnd(3, '0').slice(0, 3));
    if (!Number.isFinite(fractionMs)) {
      return NaN;
    }

    return (((hours * 60) + minutes) * 60 + seconds) * 1000 + fractionMs;
  }

  private isHeartbeatFrame(bytes: number[]): boolean {
    return bytes.length === 7
      && bytes[0] === 0x01
      && bytes[1] === 0x12
      && bytes[2] === 0x39
      && bytes[3] === 0x14
      && bytes[4] === 0x54
      && bytes[5] === 0x50
      && bytes[6] === 0x04;
  }

  private bytesToText(bytes: number[]): string {
    return bytes.map(byte => String.fromCharCode(byte)).join('');
  }

  private receivePing() {
    this.ngZone.run(() => {
      this.omegaStateSubject.next(ConnectionState.CONNECTED);
    });
    this.pingSubject.next();
  }

  private setupTimeoutCheck() {
    this.pingSubject.pipe(
      switchMap(() => timer(1000))
    ).subscribe(() => {
      this.ngZone.run(() => {
        this.omegaStateSubject.next(ConnectionState.DISCONNECTED);
      });
    });
  }
}
