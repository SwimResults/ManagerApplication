import {Component, Input} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

export interface HeadingButton {
    label: string;
    icon: string;
    clickCallback?: () => void;
}

@Component({
  selector: 'sr-heading-row',
    imports: [
        MatIcon
    ],
  templateUrl: './heading-row.component.html',
  styleUrl: './heading-row.component.scss'
})
export class HeadingRowComponent {
    @Input() heading: string = "";
    @Input() buttons: HeadingButton[] = [];
}
