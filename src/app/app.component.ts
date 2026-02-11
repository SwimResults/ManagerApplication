import {Component, inject, OnInit, OnDestroy} from '@angular/core';
import {Router, RouterOutlet, NavigationEnd} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {SidebarComponent} from './layout/sidebar/sidebar.component';
import {StatusBarComponent} from './layout/status-bar/status-bar.component';
import {HeaderComponent} from './layout/header/header.component';
import {MatIconRegistry} from '@angular/material/icon';
import {SplitAreaComponent, SplitComponent} from 'angular-split';
import {LiveTimingViewComponent} from './content/live-timing/live-timing-view/live-timing-view.component';
import {ImportStreamViewComponent} from './content/import/import-stream-view/import-stream-view.component';
import {CommonModule} from '@angular/common';
import {filter, Subscription} from 'rxjs';

@Component({
  selector: 'app-root',
    imports: [CommonModule, RouterOutlet, FormsModule, SidebarComponent, StatusBarComponent, HeaderComponent, SplitComponent, SplitAreaComponent, LiveTimingViewComponent, ImportStreamViewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  isDisplayMode = false;
  private navigationSubscription?: Subscription;

  constructor(
    iconRegistry: MatIconRegistry
  ) {
    iconRegistry.setDefaultFontSetClass("material-symbols-rounded");
  }

  ngOnInit() {
    console.log('[AppComponent] ngOnInit - Current router URL:', this.router.url);

    // Initial check
    this.isDisplayMode = this.router.url.includes('/display');
    console.log('[AppComponent] ngOnInit - Initial display mode:', this.isDisplayMode);

    // Subscribe to route changes
    this.navigationSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isDisplayMode = event.url.includes('/display');
        console.log('[AppComponent] Route change - URL:', event.url, '-> Display mode:', this.isDisplayMode);
      });
  }

  ngOnDestroy() {
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }
}
