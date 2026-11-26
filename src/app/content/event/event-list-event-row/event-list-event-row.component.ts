import {Component, inject, Input} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {SnackBarService} from '../../../core/service/ui/snack-bar.service';
import {DialogService} from '../../../core/service/dialog/dialog.service';
import {Router, RouterLink} from '@angular/router';
import {MeetingEvent, EventListHeatImpl, EventService} from '@swimresults/angular';

@Component({
    selector: 'tr[sr-event-list-event-row]',
    imports: [
        TranslatePipe,
        RouterLink
    ],
    templateUrl: './event-list-event-row.component.html',
    styleUrl: './event-list-event-row.component.scss'
})
export class EventListEventRowComponent {
    private eventService = inject(EventService);
    private snackBarService = inject(SnackBarService);
    private dialogService = inject(DialogService);
    private router = inject(Router);

    @Input() event!: MeetingEvent;
    @Input() heatInfo?: EventListHeatImpl

    getLiveTimeClass() {
        // delay
        if (!this.heatInfo) return "";
        return this.heatInfo?.first_heat.isDelayed(true) ? 'late' : 'on-time';
    }

    editEventTime() {
        if (this.heatInfo?.first_heat) {
            this.dialogService.openHeatTimeUpdateDialog(this.heatInfo?.first_heat)
        }
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

    openEvent() {
        this.router.navigateByUrl('/event/' + this.event.number);
    }
}
