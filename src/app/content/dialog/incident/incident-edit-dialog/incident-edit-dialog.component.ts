import {Component, inject} from '@angular/core';
import {MatDialogActions, MatDialogContent, MatDialogRef} from '@angular/material/dialog';
import {Incident} from '../../../../core/model/meeting/incident.model';

export interface IncidentEditDialogData {
    incident: Incident;
}

@Component({
  selector: 'app-incident-edit-dialog',
    imports: [
        MatDialogContent,
        MatDialogActions
    ],
  templateUrl: './incident-edit-dialog.component.html',
  styleUrl: './incident-edit-dialog.component.scss'
})
export class IncidentEditDialogComponent {
    dialogRef = inject<MatDialogRef<IncidentEditDialogComponent>>(MatDialogRef);


}
