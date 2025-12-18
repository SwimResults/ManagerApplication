import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {IncidentImpl} from '../../model/meeting/incident.model';
import {
    IncidentEditDialogComponent, IncidentEditDialogData
} from '../../../content/dialog/incident/incident-edit-dialog/incident-edit-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    constructor(
        private dialog: MatDialog,
    ) {}

    openIncidentEditDialog(incident?: IncidentImpl) {
        this.dialog.open(IncidentEditDialogComponent, {
            width: '95%',
            maxWidth: '950px',
            data: {
                incident: incident
            } as IncidentEditDialogData
        })
    }
}
