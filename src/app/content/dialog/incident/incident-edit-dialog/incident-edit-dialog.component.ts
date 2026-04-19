import {Component, inject, OnInit} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle
} from '@angular/material/dialog';
import {Incident, IncidentImpl} from '../../../../core/model/meeting/incident.model';
import {MatLabel, MatFormField} from '@angular/material/form-field';
import {MatSelect, MatOption} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {MatInput} from '@angular/material/input';
import {TranslatePipe} from '@ngx-translate/core';
import {MeetingImpl} from '../../../../core/model/meeting/meeting.model';
import {EventService} from '../../../../core/service/api';
import {MeetingEvent} from '../../../../core/model/meeting/meeting-event.model';
import {IncidentService} from '../../../../core/service/api/meeting/incident.service';
import {SnackBarService} from '../../../../core/service/ui/snack-bar.service';
import {UtcDateTimeInputComponent} from '../../../../layout/element/utc-date-time-input/utc-date-time-input.component';

export interface IncidentEditDialogData {
    incident: IncidentImpl;
    meeting: MeetingImpl;
}

@Component({
  selector: 'app-incident-edit-dialog',
    imports: [
        MatDialogContent,
        MatDialogActions,
        MatDialogTitle,
        MatFormField,
        MatLabel,
        MatSelect,
        MatOption,
        FormsModule,
        MatInput,
        TranslatePipe,
        UtcDateTimeInputComponent
    ],
  templateUrl: './incident-edit-dialog.component.html',
  styleUrl: './incident-edit-dialog.component.scss'
})
export class IncidentEditDialogComponent implements OnInit {
    dialogRef = inject<MatDialogRef<IncidentEditDialogComponent>>(MatDialogRef);
    data = inject<IncidentEditDialogData>(MAT_DIALOG_DATA);

    private eventService = inject(EventService)
    private incidentService = inject(IncidentService)
    private snackBarService = inject(SnackBarService)

    events?: MeetingEvent[];

    incidentNames = [
        "WARMUP",
        "JUDGES_MEETING",
        "TEAM_LEADER_MEETING",
        "BREAK",
        "CEREMONY",
    ];

    incident: IncidentImpl;

    constructor() {
        if (!this.data.incident) {
            this.incident = new IncidentImpl({
                type: "EVENT",
                start: "2025-12-20T07:15:00Z",
                end: "2025-12-20T08:15:00Z",
                meeting: this.data.meeting.meet_id
            } as Incident);
        } else {
            this.incident = this.data.incident;
        }
    }

    ngOnInit() {
        this.eventService.getEventsByMeeting(this.data.meeting.meet_id).subscribe((events) => {
            this.events = events;
        })
    }

    saveIncident() {
        if (this.data.incident) {
            this.incidentService.updateIncident(this.incident).subscribe(this.handleSaveResult())
        } else {
            this.incidentService.addIncident(this.incident).subscribe(this.handleSaveResult())
        }
    }

    private handleSaveResult() {
        return {
            next: (incident: Incident) => {
                this.dialogRef.close(incident);
                this.snackBarService.open("Gespeichert!")
            },
            error: (err: any) => {
                this.snackBarService.open("Fehler beim Speichern!")
                console.log(err)
            }
        };
    }
}
