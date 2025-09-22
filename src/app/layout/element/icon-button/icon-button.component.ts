import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-icon-button',
  imports: [
    MatIcon,
    RouterLinkActive,
    RouterLink
  ],
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.scss'
})
export class IconButtonComponent {
  @Input() icon: string = "dashboard";
  @Input() btnRouterLink?: string;

  @Output() btnClicked = new EventEmitter<PointerEvent>();

  onClick($event: PointerEvent) {
    this.btnClicked.emit($event);
  }
}
