import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { ElectronService } from './electron.service';

export interface FileMetadata {
  size: number;
  lastModified: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FileWatcherService implements OnDestroy {
  private currentFilePathSubject = new BehaviorSubject<string | null>(null);
  private fileMetadataSubject = new BehaviorSubject<FileMetadata | null>(null);
  private watcherSubscription?: Subscription;
  private lastModifiedTime: number = 0;

  currentFilePath: Observable<string | null> = this.currentFilePathSubject.asObservable();
  fileMetadata: Observable<FileMetadata | null> = this.fileMetadataSubject.asObservable();

  constructor(private electronService: ElectronService) {}

  async openFileDialog(): Promise<void> {
    const filePath = await this.electronService.openFileDialog();

    if (filePath) {
      this.setFile(filePath);
    }
  }

  private setFile(filePath: string): void {
    // Stop any existing watcher
    this.stopWatching();

    // Update current file path
    this.currentFilePathSubject.next(filePath);

    // Initialize metadata
    this.updateFileMetadata(filePath);

    // Start watching the file
    this.startWatching(filePath);
  }

  private startWatching(filePath: string): void {
    // Check file every 10 seconds
    this.watcherSubscription = interval(10000).subscribe(() => {
      this.checkFileChanges(filePath);
    });
  }

  private stopWatching(): void {
    if (this.watcherSubscription) {
      this.watcherSubscription.unsubscribe();
      this.watcherSubscription = undefined;
    }
  }

  private updateFileMetadata(filePath: string): void {
    const stats = this.electronService.getFileStats(filePath);

    if (stats) {
      const metadata: FileMetadata = {
        size: stats.size,
        lastModified: stats.mtime
      };

      this.fileMetadataSubject.next(metadata);
      this.lastModifiedTime = stats.mtimeMs;
    }
  }

  private checkFileChanges(filePath: string): void {
    const stats = this.electronService.getFileStats(filePath);

    if (!stats) {
      console.warn('File not found or cannot be accessed:', filePath);
      return;
    }

    // Check if file has been modified
    if (stats.mtimeMs !== this.lastModifiedTime) {
      console.log('File changed detected!');

      // Update metadata
      this.updateFileMetadata(filePath);

      // Read and print first 10 lines
      const lines = this.electronService.readFileLines(filePath, 10);
      console.log('First 10 lines of the file:');
      lines.forEach((line, index) => {
        console.log(`${index + 1}: ${line}`);
      });
    }
  }

  clearFile(): void {
    this.stopWatching();
    this.currentFilePathSubject.next(null);
    this.fileMetadataSubject.next(null);
    this.lastModifiedTime = 0;
  }

  ngOnDestroy(): void {
    this.stopWatching();
  }
}

