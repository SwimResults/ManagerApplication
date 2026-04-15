import {Component, inject, OnDestroy} from '@angular/core';
import {StatusBarElementComponent, StatusBarStatus} from '../status-bar-element/status-bar-element.component';
import {Subscription} from 'rxjs';
import {ConnectionState} from '../../core/model/state.model';
import {MeetingImpl} from '../../core/model/meeting/meeting.model';
import {AlgeService} from '../../core/service/alge.service';
import {ImportService} from '../../core/service/import.service';
import {CurrentMeetingService} from '../../core/service/current-meeting.service';
import {OmegaService} from '../../core/service/omega.service';

@Component({
    selector: 'app-status-bar',
    imports: [
        StatusBarElementComponent
    ],
    templateUrl: './status-bar.component.html',
    styleUrl: './status-bar.component.scss'
})
export class StatusBarComponent implements OnDestroy {
    private algeService = inject(AlgeService);
    private omegaService = inject(OmegaService)
    private importService = inject(ImportService)
    private currentMeetingService = inject(CurrentMeetingService)

    algeStateSubscription: Subscription;
    omegaStateSubscription: Subscription;
    srStateSubscription: Subscription;
    meetingSubscription: Subscription;

    algeState: ConnectionState = ConnectionState.DISCONNECTED;
    omegaState: ConnectionState = ConnectionState.DISCONNECTED;
    srState: ConnectionState | string = ConnectionState.DISCONNECTED;
    meeting?: MeetingImpl

    constructor() {
        this.algeStateSubscription = this.algeService.algeState.subscribe(algeState => this.algeState = algeState);
        this.omegaStateSubscription = this.omegaService.omegaState.subscribe(omegaState => this.omegaState = omegaState);
        this.srStateSubscription = this.importService.srState.subscribe(srState => this.srState = srState);
        this.meetingSubscription = this.currentMeetingService.currentMeeting.subscribe(meeting => this.meeting = meeting);
    }

    ngOnDestroy() {
        this.algeStateSubscription.unsubscribe();
        this.omegaStateSubscription.unsubscribe();
        this.srStateSubscription.unsubscribe();
        this.meetingSubscription.unsubscribe();
    }

    getAlgeState(): StatusBarStatus {
        switch (this.algeState) {
            case ConnectionState.DISCONNECTED:
                return StatusBarStatus.ERROR;
            case ConnectionState.CONNECTED:
                return StatusBarStatus.SUCCESS
            case ConnectionState.ERROR:
                return StatusBarStatus.ERROR;
            default:
                return StatusBarStatus.UNKNOWN;
        }
    }

    getOmegaState(): StatusBarStatus {
        switch (this.omegaState) {
            case ConnectionState.DISCONNECTED:
                return StatusBarStatus.ERROR;
            case ConnectionState.CONNECTED:
                return StatusBarStatus.SUCCESS
            case ConnectionState.ERROR:
                return StatusBarStatus.ERROR;
            default:
                return StatusBarStatus.UNKNOWN;
        }
    }

    getSrState(): StatusBarStatus {
        switch (this.srState) {
            case ConnectionState.DISCONNECTED:
                return StatusBarStatus.WARNING;
            case ConnectionState.CONNECTED:
                return StatusBarStatus.SUCCESS
            case ConnectionState.ERROR:
                return StatusBarStatus.ERROR;
            case "OK":
                return StatusBarStatus.SUCCESS;
            default:
                return StatusBarStatus.UNKNOWN;
        }
    }

    protected readonly StatusBarStatus = StatusBarStatus;
}
