import { Component, inject, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
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
  styleUrl: './live-timing-display.component.scss',
  changeDetection: ChangeDetectionStrategy.Default
})
export class LiveTimingDisplayComponent implements OnInit, OnDestroy {
  private algeService = inject(AlgeService);
  private cdr = inject(ChangeDetectorRef);

  currentHeat: CurrentHeatModel = {} as CurrentHeatModel;
  state: State = State.NOT_RUNNING;

  currentHeatSubscription: Subscription | undefined;
  stateSubscription: Subscription | undefined;

  ngOnInit() {
    console.log('[LiveTimingDisplayComponent] Component initialized');

    this.currentHeatSubscription = this.algeService.currentHeat.subscribe(heat => {
      console.log('[LiveTimingDisplayComponent] Current heat subscription received:', {
        event: heat.event,
        heat: heat.heat,
        competitors: heat.competitors.size,
        timestamp: new Date().toISOString()
      });
      this.currentHeat = heat;
      console.log('[LiveTimingDisplayComponent] Updated currentHeat, triggering change detection');
      this.cdr.markForCheck();
    });

    this.stateSubscription = this.algeService.state.subscribe(state => {
      console.log('[LiveTimingDisplayComponent] State subscription received:', state, 'at', new Date().toISOString());
      this.state = state;
      console.log('[LiveTimingDisplayComponent] Updated state to:', this.state);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    console.log('[LiveTimingDisplayComponent] Component destroyed');
    this.currentHeatSubscription?.unsubscribe();
    this.stateSubscription?.unsubscribe();
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
