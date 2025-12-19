import {Component, inject, Input} from '@angular/core';
import {IncidentImpl} from '../../../core/model/meeting/incident.model';
import {TranslatePipe} from '@ngx-translate/core';
import {DialogService} from '../../../core/service/dialog/dialog.service';

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

    @Input() incident!: IncidentImpl

    editIncident() {
        this.dialogService.openIncidentEditDialog(this.incident);
    }

    deleteIncident() {

    }
}
