import {Component, inject, OnInit} from '@angular/core';
import {IconButtonComponent} from '../element/icon-button/icon-button.component';
import {MeetingService} from '../../core/service/api';
import {Meeting, MeetingImpl} from '../../core/model/meeting/meeting.model';

@Component({
    selector: 'app-header',
    imports: [
        IconButtonComponent
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
    meetingService: MeetingService = inject(MeetingService);

    meetings: MeetingImpl[] = [];

    ngOnInit() {
        this.meetingService.getMeetings().subscribe(meetings => this.meetings = meetings.map(m => new MeetingImpl(m)));
    }

    protected readonly MeetingImpl = MeetingImpl;
}
