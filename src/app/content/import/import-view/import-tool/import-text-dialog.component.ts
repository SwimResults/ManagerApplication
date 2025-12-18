import { Component, inject } from "@angular/core";
import {
    MAT_DIALOG_DATA,
    MatDialogRef,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
} from "@angular/material/dialog";
import {ImportFileRequest} from "../../../../core/service/api/import/import-file.service";
import {MatFormField, MatLabel} from "@angular/material/select";
import {MatInput} from "@angular/material/input";
import {ReactiveFormsModule, FormsModule} from "@angular/forms";
import {MatButton} from "@angular/material/button";

@Component({
    selector: 'sr-admin-import-text-dialog',
    templateUrl: './import-text-dialog.component.html',
    styleUrls: ['./import-text-dialog.component.scss'],
    imports: [MatDialogTitle, MatDialogContent, MatFormField, MatLabel, MatInput, ReactiveFormsModule, FormsModule, MatDialogActions, MatButton, MatDialogClose]
})
export class ImportTextDialogComponent {
    dialogRef = inject<MatDialogRef<ImportTextDialogComponent>>(MatDialogRef);
    data = inject<ImportFileRequest>(MAT_DIALOG_DATA);


    onNoClick(): void {
        this.dialogRef.close();
    }
}
