import {Component, inject, OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';
import {CurrentMeetingService} from '../../core/service/current-meeting.service';
import {MatIcon} from '@angular/material/icon';
import {MeetingImpl} from '@swimresults/angular';

@Component({
  selector: 'app-main',
    imports: [
        MatIcon
    ],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent implements OnDestroy {
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
