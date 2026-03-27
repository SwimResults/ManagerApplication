import { Component } from '@angular/core';
import {IconButtonComponent} from '../element/icon-button/icon-button.component';
import {Router} from '@angular/router';
import {ActiveViewModeDirective} from '../../core/directive/active-view-mode.directive';

@Component({
  selector: 'app-sidebar',
    imports: [
        IconButtonComponent,
        ActiveViewModeDirective
    ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {

  constructor(
    private router: Router
  ) {
  }

  onOldLive() {
    this.router.navigateByUrl('/old');
  }
}
