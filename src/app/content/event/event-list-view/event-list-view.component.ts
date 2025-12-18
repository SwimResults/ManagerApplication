import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {MeetingImpl} from '../../../core/model/meeting/meeting.model';
import {Subscription} from 'rxjs';
import {CurrentMeetingService} from '../../../core/service/current-meeting.service';
import {EventListComponent} from '../event-list/event-list.component';

@Component({
  selector: 'sr-event-list-view',
    imports: [
        EventListComponent
    ],
  templateUrl: './event-list-view.component.html',
  styleUrl: './event-list-view.component.scss'
})
export class EventListViewComponent implements OnDestroy {
    private currentMeetingService = inject(CurrentMeetingService)
    private meetingSubscription: Subscription;
    meeting: MeetingImpl = {} as MeetingImpl;

    constructor() {
        this.meetingSubscription = this.currentMeetingService.currentMeeting.subscribe(meeting => {
            this.meeting = meeting;
        })
    }

    ngOnDestroy() {
        this.meetingSubscription.unsubscribe();
    }
}
