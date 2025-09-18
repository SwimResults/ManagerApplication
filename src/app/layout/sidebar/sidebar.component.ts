import { Component } from '@angular/core';
import {IconButtonComponent} from '../element/icon-button/icon-button.component';
import {Router} from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [
    IconButtonComponent
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
