import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-icon-button',
  imports: [
    MatIcon,
    RouterLinkActive,
    RouterLink,
    MatTooltip
  ],
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.scss'
})
export class IconButtonComponent {
  @Input() icon: string = "dashboard";
  @Input() btnRouterLink?: string;
  @Input() tooltip?: string;

  @Output() btnClicked = new EventEmitter<PointerEvent>();

  onClick($event: PointerEvent) {
    this.btnClicked.emit($event);
  }
}
