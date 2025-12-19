import { Component, Input } from '@angular/core';
import {LogEvent} from '../../../core/service/api/import/import-file.service';
import {CommonModule} from '@angular/common';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'sr-import-log',
  imports: [CommonModule, MatIcon],
  templateUrl: './import-log.component.html',
  styleUrl: './import-log.component.scss'
})
export class ImportLogComponent {
  @Input() logs: LogEvent[] = [];

  getLogIcon(level: string): string {
    switch (level.toLowerCase()) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      case 'info':
      default: return 'info';
    }
  }
}
