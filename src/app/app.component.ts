import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {SidebarComponent} from './layout/sidebar/sidebar.component';
import {StatusBarComponent} from './layout/status-bar/status-bar.component';
import {HeaderComponent} from './layout/header/header.component';
import {MatIconRegistry} from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, SidebarComponent, StatusBarComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true
})
export class AppComponent {
  constructor(
    iconRegistry: MatIconRegistry
  ) {
    iconRegistry.setDefaultFontSetClass("material-symbols-rounded");
  }
}
