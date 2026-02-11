import {Component, inject} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {SidebarComponent} from './layout/sidebar/sidebar.component';
import {StatusBarComponent} from './layout/status-bar/status-bar.component';
import {HeaderComponent} from './layout/header/header.component';
import {MatIconRegistry} from '@angular/material/icon';
import {SplitAreaComponent, SplitComponent} from 'angular-split';
import {LiveTimingViewComponent} from './content/live-timing/live-timing-view/live-timing-view.component';
import {ImportStreamViewComponent} from './content/import/import-stream-view/import-stream-view.component';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-root',
    imports: [CommonModule, RouterOutlet, FormsModule, SidebarComponent, StatusBarComponent, HeaderComponent, SplitComponent, SplitAreaComponent, LiveTimingViewComponent, ImportStreamViewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true
})
export class AppComponent {
  private router = inject(Router);

  constructor(
    iconRegistry: MatIconRegistry
  ) {
    iconRegistry.setDefaultFontSetClass("material-symbols-rounded");
  }

  isDisplayRoute(): boolean {
    return this.router.url.startsWith('/display');
  }
}
