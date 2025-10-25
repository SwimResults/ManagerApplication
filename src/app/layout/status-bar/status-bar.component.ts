import { Component } from '@angular/core';
import {StatusBarElementComponent, StatusBarStatus} from '../status-bar-element/status-bar-element.component';

@Component({
  selector: 'app-status-bar',
  imports: [
    StatusBarElementComponent
  ],
  templateUrl: './status-bar.component.html',
  styleUrl: './status-bar.component.scss'
})
export class StatusBarComponent {

  protected readonly StatusBarStatus = StatusBarStatus;
}
