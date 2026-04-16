import {Component, Input} from '@angular/core';

export enum StatusBarStatus {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  UNKNOWN = "unknown",
}

@Component({
  selector: 'app-status-bar-element',
  imports: [],
  templateUrl: './status-bar-element.component.html',
  styleUrl: './status-bar-element.component.scss'
})
export class StatusBarElementComponent {
  @Input() text: string = "";
  @Input() status?: StatusBarStatus;
}
