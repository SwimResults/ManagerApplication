import {Component, inject} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle
} from "@angular/material/dialog";
import {Heat} from '../../../../core/model/start/heat.model';
import {HeatService} from '../../../../core/service/api';
import {SnackBarService} from '../../../../core/service/ui/snack-bar.service';
import {UtcDateTimeInputComponent} from '../../../../layout/element/utc-date-time-input/utc-date-time-input.component';

export interface HeatUpdateTimeDialogData {
    heat: Heat;
}

@Component({
  selector: 'sr-heat-update-time-dialog',
    imports: [
        MatDialogActions,
        MatDialogContent,
        MatDialogTitle,
        UtcDateTimeInputComponent
    ],
  templateUrl: './heat-update-time-dialog.component.html',
  styleUrl: './heat-update-time-dialog.component.scss'
})
export class HeatUpdateTimeDialogComponent {
    dialogRef = inject<MatDialogRef<HeatUpdateTimeDialogComponent>>(MatDialogRef);
    data = inject<HeatUpdateTimeDialogData>(MAT_DIALOG_DATA);

    private heatService = inject(HeatService);
    private snackBarService = inject(SnackBarService);

    saveHeatTime() {
        this.heatService.updateHeatTime(this.data.heat._id, "start_delay_estimation", this.data.heat.start_delay_estimation).subscribe({
            next: data => {
                this.snackBarService.open("Zeiten wurden aktualisiert!")
                this.dialogRef.close(data);
            }, error: err => {
                this.snackBarService.open("Speichern fehlgeschlagen!")
                console.log(err)
        }
        })
    }
}
