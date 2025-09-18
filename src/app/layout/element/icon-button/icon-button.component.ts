import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-icon-button',
  imports: [
    MatIcon
  ],
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.scss'
})
export class IconButtonComponent {
  @Input() icon: string = "dashboard";

  @Output() btnClicked = new EventEmitter<PointerEvent>();

  onClick($event: PointerEvent) {
    this.btnClicked.emit($event);
  }
}
