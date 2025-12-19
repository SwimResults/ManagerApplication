import { Component, Input } from '@angular/core';
import {ProgressEvent} from '../../../core/service/api/import/import-file.service';
import {MatProgressBar} from '@angular/material/progress-bar';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'sr-import-progress',
  imports: [MatProgressBar, CommonModule],
  templateUrl: './import-progress.component.html',
  styleUrl: './import-progress.component.scss'
})
export class ImportProgressComponent {
  @Input() progress: ProgressEvent | null = null;

  getPercentage(): number {
    if (!this.progress) return 0;
    // Handle both formats: Go sends 'progress' (0-100), alternative might have 'percentage'
    return this.progress.percentage || this.progress.progress || 0;
  }

  getMessage(): string {
    if (!this.progress) return '';
    return this.progress.message || '';
  }
}
