import {Component, inject, OnInit} from '@angular/core';
import {IconButtonComponent} from '../element/icon-button/icon-button.component';
import {MeetingService} from '../../core/service/api';
import {MeetingImpl} from '../../core/model/meeting/meeting.model';
import {MatSelect, MatOption, MatSelectChange, MatFormField} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {CurrentMeetingService} from '../../core/service/current-meeting.service';

@Component({
    selector: 'app-header',
    imports: [
        IconButtonComponent,
        MatSelect,
        MatOption,
        MatFormField,
        FormsModule
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
    meetingService = inject(MeetingService);
    currentMeetingService = inject(CurrentMeetingService);

    meetings: MeetingImpl[] = [];

    selectedMeeting?: MeetingImpl;

    ngOnInit() {
        this.meetingService.getMeetings().subscribe(meetings => {
            this.meetings = meetings.map(m => new MeetingImpl(m));

            let current = window.localStorage.getItem("currentMeeting");
            if (current) {
                console.log("searching for meeting:", current)
                let meeting = this.meetings.find(m => m.meet_id == current);

                if (meeting) {
                    this.selectedMeeting = meeting;
                    this.currentMeetingService.setCurrentMeeting(meeting);
                }
            }
        });

    }

    meetingSelectionChange($event: MatSelectChange) {
        console.log($event);

        this.currentMeetingService.setCurrentMeeting($event.value);
    }
}
