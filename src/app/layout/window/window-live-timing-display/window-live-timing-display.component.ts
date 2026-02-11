import { Component } from '@angular/core';
import {
    LiveTimingDisplayComponent
} from '../../../content/live-timing/live-timing-display/live-timing-display.component';

@Component({
  selector: 'sr-window-live-timing-display',
    imports: [
        LiveTimingDisplayComponent
    ],
  templateUrl: './window-live-timing-display.component.html',
  styleUrl: './window-live-timing-display.component.scss'
})
export class WindowLiveTimingDisplayComponent {

}
