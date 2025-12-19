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

  getReversedLogs(): LogEvent[] {
    return [...this.logs].reverse();
  }

  trackByIndex(index: number): number {
    return index;
  }

  formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return timestamp;
    }
  }
}
