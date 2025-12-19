import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {ImportLogComponent} from '../import-log/import-log.component';
import {ImportProgressComponent} from '../import-progress/import-progress.component';
import {ImportFileService, LogEvent, ProgressEvent} from '../../../core/service/api/import/import-file.service';
import {Subject, takeUntil} from 'rxjs';
import {BtnComponent} from '../../../layout/element/buttons/btn/btn.component';
import {MatIcon} from '@angular/material/icon';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'sr-import-stream-view',
    imports: [
        ImportLogComponent,
        ImportProgressComponent,
        BtnComponent,
        MatIcon,
        CommonModule
    ],
  templateUrl: './import-stream-view.component.html',
  styleUrl: './import-stream-view.component.scss'
})
export class ImportStreamViewComponent implements OnInit, OnDestroy {
  private importFileService = inject(ImportFileService);
  private destroy$ = new Subject<void>();

  streamId: string | null = null;
  isConnected = false;
  currentProgress: ProgressEvent | null = null;
  logs: LogEvent[] = [];

  ngOnInit(): void {
    // Subscribe to connection status
    this.importFileService.connection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
        if (!connected) {
          this.streamId = null;
        }
      });

    // Subscribe to progress updates
    this.importFileService.progress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.currentProgress = progress;
      });

    // Subscribe to log messages
    this.importFileService.log$
      .pipe(takeUntil(this.destroy$))
      .subscribe(log => {
        console.log('Log received:', log);
        this.logs.push(log);
        console.log('Total logs:', this.logs.length);
      });
  }

  ngOnDestroy(): void {
    this.closeStream();
    this.destroy$.next();
    this.destroy$.complete();
  }

  openStream(): void {
    this.streamId = this.importFileService.generateStreamId();
    this.logs = [];
    this.currentProgress = null;
    this.importFileService.openStream(this.streamId);
  }

  closeStream(): void {
    this.importFileService.closeStream();
    this.streamId = null;
  }

  clearLogs(): void {
    this.logs = [];
    this.currentProgress = null;
  }
}
