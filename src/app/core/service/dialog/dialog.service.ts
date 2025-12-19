import {inject, Injectable, OnDestroy} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {IncidentImpl} from '../../model/meeting/incident.model';
import {
    IncidentEditDialogComponent, IncidentEditDialogData
} from '../../../content/dialog/incident/incident-edit-dialog/incident-edit-dialog.component';
import {CurrentMeetingService} from '../current-meeting.service';
import {MeetingImpl} from '../../model/meeting/meeting.model';
import {Subscription} from 'rxjs';
import {MeetingEvent} from '../../model/meeting/meeting-event.model';

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

    openIncidentEditDialog(incident?: IncidentImpl) {
        this.dialog.open(IncidentEditDialogComponent, {
            width: '95%',
            maxWidth: '950px',
            data: {
                incident: incident,
                meeting: this.meeting
            } as IncidentEditDialogData
        })
    }
}
