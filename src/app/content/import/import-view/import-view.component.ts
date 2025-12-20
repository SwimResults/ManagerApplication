import {Component, inject} from '@angular/core';
import {ImportToolComponent} from './import-tool/import-tool.component';
import {CurrentMeetingService} from '../../../core/service/current-meeting.service';
import {Subscription} from 'rxjs';
import {MeetingImpl} from '../../../core/model/meeting/meeting.model';
import {AutoImportToolComponent} from '../auto-import-tool/auto-import-tool.component';

@Component({
  selector: 'app-import-view',
    imports: [
        ImportToolComponent,
        AutoImportToolComponent
    ],
  templateUrl: './import-view.component.html',
  styleUrl: './import-view.component.scss'
})
export class ImportViewComponent {
    private currentMeetingService = inject(CurrentMeetingService);

    private meetingSubscription: Subscription;

    meeting: MeetingImpl = {} as MeetingImpl;

    constructor() {
        this.meetingSubscription = this.currentMeetingService.currentMeeting.subscribe(meeting => {
            this.meeting = meeting;
        })
    }
}
