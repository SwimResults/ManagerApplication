import {Component, inject, OnDestroy} from '@angular/core';
import {AlgeTimePipe} from "../../../core/pipe/alge-time.pipe";
import {GroupBoxComponent} from "../../../layout/group-box/group-box.component";
import {TranslatePipe} from "@ngx-translate/core";
import {Competitor, CurrentHeatModel} from '../../../core/model/current-heat.model';
import {
    getAvailableMeters,
    getClassForConnectionState,
    getClassForState, getCompetitorsSorted
} from '../../../core/function/live-timing.functions';
import {State} from '../../../core/model/state.model';
import {Subscription} from 'rxjs';
import {AlgeService} from '../../../core/service/alge.service';

@Component({
  selector: 'sr-live-timing-view',
    imports: [
        AlgeTimePipe,
        GroupBoxComponent,
        TranslatePipe
    ],
  templateUrl: './live-timing-view.component.html',
  styleUrl: './live-timing-view.component.scss'
})
export class LiveTimingViewComponent implements OnDestroy {
    private algeService = inject(AlgeService);

    currentHeat: CurrentHeatModel = {} as CurrentHeatModel;
    state: State = State.NOT_RUNNING;

    currentHeatSubscription: Subscription;
    stateSubscription: Subscription;

    constructor() {
        this.currentHeatSubscription = this.algeService.currentHeat.subscribe(heat => {
            this.currentHeat = heat;
        })

        this.stateSubscription = this.algeService.state.subscribe(state => {
            this.state = state;
        })
    }

    ngOnDestroy() {
        this.currentHeatSubscription.unsubscribe();
        this.stateSubscription.unsubscribe();
    }

    protected readonly getClassForState = getClassForState;
    protected readonly getAvailableMeters = getAvailableMeters;
    protected readonly getCompetitorsSorted = getCompetitorsSorted;
}
