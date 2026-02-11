import { Component, inject, OnDestroy } from '@angular/core';
import { AlgeTimePipe } from "../../../core/pipe/alge-time.pipe";
import { TranslatePipe } from "@ngx-translate/core";
import { Competitor, CurrentHeatModel } from '../../../core/model/current-heat.model';
import { getCompetitorsSorted } from '../../../core/function/live-timing.functions';
import { State } from '../../../core/model/state.model';
import { Subscription } from 'rxjs';
import { AlgeService } from '../../../core/service/alge.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sr-live-timing-display',
  imports: [
    CommonModule,
    AlgeTimePipe,
    TranslatePipe
  ],
  templateUrl: './live-timing-display.component.html',
  styleUrl: './live-timing-display.component.scss'
})
export class LiveTimingDisplayComponent implements OnDestroy {
  private algeService = inject(AlgeService);

  currentHeat: CurrentHeatModel = {} as CurrentHeatModel;
  state: State = State.NOT_RUNNING;

  currentHeatSubscription: Subscription;
  stateSubscription: Subscription;

  constructor() {
    this.currentHeatSubscription = this.algeService.currentHeat.subscribe(heat => {
      this.currentHeat = heat;
    });

    this.stateSubscription = this.algeService.state.subscribe(state => {
      this.state = state;
    });
  }

  ngOnDestroy() {
    this.currentHeatSubscription.unsubscribe();
    this.stateSubscription.unsubscribe();
  }

  protected readonly getCompetitorsSorted = getCompetitorsSorted;

  getLatestTime(competitor: Competitor): number {
    if (!competitor.splits || competitor.splits.size === 0) {
      return -1;
    }
    const sortedKeys = Array.from(competitor.splits.keys()).sort((a, b) => b - a);
    return competitor.splits.get(sortedKeys[0]) || -1;
  }
}
