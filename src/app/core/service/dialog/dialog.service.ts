import {inject, Injectable, OnDestroy} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Incident, IncidentImpl} from '../../model/meeting/incident.model';
import {
    IncidentEditDialogComponent, IncidentEditDialogData
} from '../../../content/dialog/incident/incident-edit-dialog/incident-edit-dialog.component';
import {CurrentMeetingService} from '../current-meeting.service';
import {MeetingImpl} from '../../model/meeting/meeting.model';
import {Subject, Subscription} from 'rxjs';
import {Heat} from '../../model/start/heat.model';
import {
    HeatUpdateTimeDialogComponent,
    HeatUpdateTimeDialogData
} from '../../../content/dialog/heat/heat-update-time-dialog/heat-update-time-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class DialogService implements OnDestroy {
    private currentMeetingService = inject(CurrentMeetingService);

    private meetingSubscription: Subscription;

    meeting: MeetingImpl = {} as MeetingImpl;


    constructor(
        private dialog: MatDialog,
    ) {
        this.meetingSubscription = this.currentMeetingService.currentMeeting.subscribe(meeting => {
            this.meeting = meeting;
        })
    }

    ngOnDestroy() {
        this.meetingSubscription.unsubscribe();
    }

    openIncidentEditDialog(incident?: IncidentImpl, eventSubject?: Subject<Incident>) {
        const dialogRef = this.dialog.open(IncidentEditDialogComponent, {
            width: '95%',
            maxWidth: '950px',
            data: {
                incident: incident,
                meeting: this.meeting
            } as IncidentEditDialogData
        })

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                eventSubject?.next(result);
            }
        });
    }

    openHeatTimeUpdateDialog(heat: Heat, eventSubject?: Subject<Heat>) {
        const dialogRef = this.dialog.open(HeatUpdateTimeDialogComponent, {
            width: '50%',
            maxWidth: '400px',
            data: {
                heat: heat
            } as HeatUpdateTimeDialogData
        })

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                eventSubject?.next(result);
            }
        });
    }
}
