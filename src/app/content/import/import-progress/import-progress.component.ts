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
}
