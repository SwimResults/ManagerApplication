import {Component, inject, OnDestroy} from '@angular/core';
import {FileMetadata, FileWatcherService} from '../../../core/service/file-watcher.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'sr-auto-import-tool',
  imports: [],
  templateUrl: './auto-import-tool.component.html',
  styleUrl: './auto-import-tool.component.scss'
})
export class AutoImportToolComponent implements OnDestroy {
    private fileWatcherService = inject(FileWatcherService);

    fileNameSubscription: Subscription;
    fileMetaSubscription: Subscription;

    fileName: string | null = null;
    fileMeta: FileMetadata | null = null;

    constructor() {
        this.fileNameSubscription = this.fileWatcherService.currentFilePath.subscribe(path => {
            this.fileName = path;
        })

        this.fileMetaSubscription = this.fileWatcherService.fileMetadata.subscribe(meta => {
            this.fileMeta = meta;
        })
    }

    ngOnDestroy() {
        this.fileNameSubscription.unsubscribe();
        this.fileMetaSubscription.unsubscribe();
    }

    selectFile() {
        this.fileWatcherService.openFileDialog();
    }
}
