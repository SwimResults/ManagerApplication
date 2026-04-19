import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {MatFormField, MatLabel} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {
    isoUtcToLocalDateTimeParts,
    localDateTimePartsToIsoUtc
} from '../../../core/function/utc-date-time.functions';

@Component({
    selector: 'app-utc-date-time-input',
    imports: [
        MatFormField,
        MatLabel,
        MatInput,
        FormsModule
    ],
    templateUrl: './utc-date-time-input.component.html',
    styleUrl: './utc-date-time-input.component.scss'
})
export class UtcDateTimeInputComponent implements OnChanges {
    @Input() label = 'Zeitpunkt';
    @Input() isoValue?: string | null;
    @Input() disabled = false;
    @Input() showUtcHint = true;

    @Output() isoValueChange = new EventEmitter<string>();

    dateValue = '';
    timeValue = '';
    private isEditing = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (!changes['isoValue']) {
            return;
        }

        if (this.isEditing) {
            return;
        }

        const localDateTime = isoUtcToLocalDateTimeParts(this.isoValue);
        this.dateValue = localDateTime.date;
        this.timeValue = localDateTime.time;
    }

    onDateOrTimeChange(): void {
        if (!this.dateValue && !this.timeValue) {
            this.isoValueChange.emit('');
            return;
        }

        // Avoid reformatting while the user is still typing an incomplete value.
        const isDateComplete = this.dateValue.length === 10;
        const isTimeComplete = this.timeValue.length >= 5;
        if (!isDateComplete || !isTimeComplete) {
            return;
        }

        const isoUtcDateTime = localDateTimePartsToIsoUtc(this.dateValue, this.timeValue);
        if (isoUtcDateTime) {
            this.isoValueChange.emit(isoUtcDateTime);
        }
    }

    onFieldFocus(): void {
        this.isEditing = true;
    }

    onFieldBlur(): void {
        this.isEditing = false;
        this.onDateOrTimeChange();
    }
}
