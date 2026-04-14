import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Competitor, CurrentHeatModel} from '../model/current-heat.model';
import {State} from '../model/state.model';

export function createEmptyCurrentHeat(): CurrentHeatModel {
  return {
    event: 0,
    heat: 0,
    distance: 0,
    laps: 0,
    style: '',
    runningTime: -1,
    competitors: new Map<number, Competitor>()
  } as CurrentHeatModel;
}

export function createEmptyCompetitor(lane: number): Competitor {
  return {
    lane,
    first_name: '',
    last_name: '',
    team: '',
    lap: 0,
    lapM: 0,
    splits: new Map<number, number>()
  } as Competitor;
}

@Injectable({
  providedIn: 'root'
})
export class TimingStateService {
  private currentHeatSubject = new BehaviorSubject<CurrentHeatModel>(createEmptyCurrentHeat());
  currentHeat = this.currentHeatSubject.asObservable();

  private stateSubject = new BehaviorSubject<State>(State.NOT_RUNNING);
  state = this.stateSubject.asObservable();

  get currentHeatValue(): CurrentHeatModel {
    return this.currentHeatSubject.value;
  }

  get stateValue(): State {
    return this.stateSubject.value;
  }

  setCurrentHeat(runningHeat: CurrentHeatModel) {
    this.currentHeatSubject.next(runningHeat);
  }

  setState(state: State) {
    this.stateSubject.next(state);
  }

  mutateCurrentHeat(mutator: (heat: CurrentHeatModel) => void) {
    mutator(this.currentHeatSubject.value);
    this.currentHeatSubject.next(this.currentHeatSubject.value);
  }

  resetCurrentHeat() {
    this.currentHeatSubject.next(createEmptyCurrentHeat());
  }

  getOrCreateCompetitor(lane: number): Competitor {
    if (!this.currentHeatSubject.value.competitors.has(lane)) {
      this.currentHeatSubject.value.competitors.set(lane, createEmptyCompetitor(lane));
    }

    return this.currentHeatSubject.value.competitors.get(lane)!;
  }
}
