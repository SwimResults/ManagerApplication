import {Component, inject, Input, OnInit} from '@angular/core';
import {MeetingImpl} from '../../../core/model/meeting/meeting.model';
import {EventService, MeetingService} from '../../../core/service/api';
import {MeetingPart} from '../../../core/model/meeting/meeting-part.model';
import {IncidentImpl} from '../../../core/model/meeting/incident.model';
import {EventListEventRowComponent} from '../event-list-event-row/event-list-event-row.component';
import {EventListIncidentRowComponent} from '../event-list-incident-row/event-list-incident-row.component';

@Component({
    selector: 'sr-event-list',
    imports: [
        EventListEventRowComponent,
        EventListIncidentRowComponent
    ],
    templateUrl: './event-list.component.html',
    styleUrl: './event-list.component.scss'
})
export class EventListComponent implements OnInit {
    @Input() meeting!: MeetingImpl;

    private eventService = inject(EventService);
    private meetingService = inject(MeetingService);

    parts: MeetingPart[] = [];

    incidents: Map<number, IncidentImpl[]> = new Map<number, IncidentImpl[]>()

    ngOnInit() {
        this.eventService.getEventsAsPartsByMeeting(this.meeting.meet_id).subscribe(
            p => {
                this.parts = p;
            }
        )


        this.meetingService.getIncidentsByMeeting(this.meeting.meet_id).subscribe(incidents => {
            for (const incident of incidents) {
                let event = 0;
                if (incident.prev_event) {
                    event = incident.prev_event;
                }
                if (incident.next_event) {
                    event = incident.next_event;
                }
                if (!this.incidents.has(event)) {
                    this.incidents.set(event, []);
                }
                this.incidents.get(event)?.push(new IncidentImpl(incident));
            }
        })
    }
}
