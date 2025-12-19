import {Component, inject, Input} from '@angular/core';
import {IncidentImpl} from '../../../core/model/meeting/incident.model';
import {TranslatePipe} from '@ngx-translate/core';
import {DialogService} from '../../../core/service/dialog/dialog.service';
import {IncidentService} from '../../../core/service/api/meeting/incident.service';
import {SnackBarService} from '../../../core/service/ui/snack-bar.service';

@Component({
  selector: 'tr[sr-event-list-incident-row]',
    imports: [
        TranslatePipe
    ],
  templateUrl: './event-list-incident-row.component.html',
  styleUrl: './event-list-incident-row.component.scss'
})
export class EventListIncidentRowComponent {
    private dialogService = inject(DialogService);
    private incidentService = inject(IncidentService);
    private snackBarService = inject(SnackBarService);

    @Input() incident!: IncidentImpl

    editIncident() {
        this.dialogService.openIncidentEditDialog(this.incident);
    }

    deleteIncident() {
        if (!confirm('Wirklich löschen?')) {
            return;
        }

        this.incidentService.deleteIncident(this.incident).subscribe({
            next: () => {
                this.snackBarService.open("Gelöscht!")
            }, error: () => {
                this.snackBarService.open("Fehler beim Löschen!");
            }
        })
    }
}
