import {Component, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MeetingEvent} from '../../../core/model/meeting/meeting-event.model';

@Component({
  selector: 'tr[sr-event-list-event-row]',
    imports: [
        TranslatePipe
    ],
  templateUrl: './event-list-event-row.component.html',
  styleUrl: './event-list-event-row.component.scss'
})
export class EventListEventRowComponent {
    @Input() event!: MeetingEvent;
}
