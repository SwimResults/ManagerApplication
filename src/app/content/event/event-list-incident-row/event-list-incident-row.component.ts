import {Component, Input} from '@angular/core';
import {IncidentImpl} from '../../../core/model/meeting/incident.model';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'tr[sr-event-list-incident-row]',
    imports: [
        TranslatePipe
    ],
  templateUrl: './event-list-incident-row.component.html',
  styleUrl: './event-list-incident-row.component.scss'
})
export class EventListIncidentRowComponent {
    @Input() incident!: IncidentImpl

    editIncident() {

    }

    deleteIncident() {

    }
}
