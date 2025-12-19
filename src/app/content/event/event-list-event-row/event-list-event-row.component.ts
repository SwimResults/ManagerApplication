import {Component, inject, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MeetingEvent} from '../../../core/model/meeting/meeting-event.model';
import {EventListHeatImpl} from '../../../core/model/start/event-list-heat.model';
import {EventService} from '../../../core/service/api';
import {SnackBarService} from '../../../core/service/ui/snack-bar.service';

@Component({
    selector: 'tr[sr-event-list-event-row]',
    imports: [
        TranslatePipe
    ],
    templateUrl: './event-list-event-row.component.html',
    styleUrl: './event-list-event-row.component.scss'
})
export class EventListEventRowComponent {
    private eventService = inject(EventService);
    private snackBarService = inject(SnackBarService);

    @Input() event!: MeetingEvent;
    @Input() heatInfo?: EventListHeatImpl

    getLiveTimeClass() {
        // delay
        if (!this.heatInfo) return "";
        return this.heatInfo?.first_heat.isDelayed(true) ? 'late' : 'on-time';
    }

    editEventTime() {

    }

    deleteEvent() {
        if (!confirm('Wirklich löschen?')) {
            return;
        }

        this.eventService.deleteEvent(this.event._id).subscribe({
            next: () => {
                this.snackBarService.open("Gelöscht!")
            }, error: () => {
                this.snackBarService.open("Fehler beim Löschen!");
            }
        })

    }
}
