import {Component, inject, Input, OnInit} from '@angular/core';
import {MeetingImpl} from '../../../core/model/meeting/meeting.model';
import {EventService, HeatService, MeetingService} from '../../../core/service/api';
import {MeetingPart} from '../../../core/model/meeting/meeting-part.model';
import {IncidentImpl} from '../../../core/model/meeting/incident.model';
import {EventListEventRowComponent} from '../event-list-event-row/event-list-event-row.component';
import {EventListIncidentRowComponent} from '../event-list-incident-row/event-list-incident-row.component';
import {EventListHeatImpl} from '../../../core/model/start/event-list-heat.model';
import {HeadingButton, HeadingRowComponent} from '../../../layout/element/heading-row/heading-row.component';
import {DialogService} from '../../../core/service/dialog/dialog.service';

@Component({
    selector: 'sr-event-list',
    imports: [
        EventListEventRowComponent,
        EventListIncidentRowComponent,
        HeadingRowComponent
    ],
    templateUrl: './event-list.component.html',
    styleUrl: './event-list.component.scss'
})
export class EventListComponent implements OnInit {
    @Input() meeting!: MeetingImpl;

    private eventService = inject(EventService);
    private meetingService = inject(MeetingService);
    private heatService = inject(HeatService);
    private dialogService = inject(DialogService);

    parts: MeetingPart[] = [];
    incidents: Map<number, IncidentImpl[]> = new Map<number, IncidentImpl[]>()
    heatInfos: Map<number, EventListHeatImpl> = new Map<number, EventListHeatImpl>();

    headingButtons: HeadingButton[] = [
        {
            label: "Wettkampf erstellen",
            icon: "flag",
            clickCallback: this.createEvent
        },
        {
            label: "Ereignis erstellen",
            icon: "flag",
            clickCallback: this.createIncident.bind(this)
        }
    ];

    ngOnInit() {
        this.eventService.getEventsAsPartsByMeeting(this.meeting.meet_id).subscribe(
            p => {
                this.parts = p;
            }
        )

        this.heatService.getHeatsByMeetingForEventList(this.meeting.meet_id).subscribe(heatInfos => {
            this.heatInfos = new Map(heatInfos.events.map(e => [e.event_number, new EventListHeatImpl(e)]));
        });

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

    createEvent() {

    }

    createIncident() {
        this.dialogService.openIncidentEditDialog();
    }
}
