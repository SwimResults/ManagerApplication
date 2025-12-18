import {Component, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MeetingEvent} from '../../../core/model/meeting/meeting-event.model';
import {EventListHeatImpl} from '../../../core/model/start/event-list-heat.model';

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
    @Input() heatInfo?: EventListHeatImpl

    getLiveTimeClass() {
        // delay
        if (!this.heatInfo) return "";
        return this.heatInfo?.first_heat.isDelayed(true)  ? 'late' : 'on-time';
    }
}
