import {Component, inject, OnDestroy} from '@angular/core';
import {FileMetadata, FileWatcherService} from '../../../core/service/file-watcher.service';
import {Subscription} from 'rxjs';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatIcon} from "@angular/material/icon";
import {GroupBoxComponent} from '../../../layout/group-box/group-box.component';

@Component({
  selector: 'sr-auto-import-tool',
    imports: [
        MatSlideToggle,
        MatIcon,
        GroupBoxComponent
    ],
  templateUrl: './auto-import-tool.component.html',
  styleUrl: './auto-import-tool.component.scss'
})
export class AutoImportToolComponent implements OnDestroy {
    private fileWatcherService = inject(FileWatcherService);

    fileNameSubscription: Subscription;
    fileMetaSubscription: Subscription;
    changeLogSubscription: Subscription;
    autoImportActiveSubscription: Subscription;

    fileName: string | null = null;
    fileMeta: FileMetadata | null = null;

    changeLog: string[] = [];

    autoImportActive: boolean = false;

    constructor() {
        this.fileNameSubscription = this.fileWatcherService.currentFilePath.subscribe(path => {
            this.fileName = path;
        })

        this.fileMetaSubscription = this.fileWatcherService.fileMetadata.subscribe(meta => {
            this.fileMeta = meta;
        })

        this.changeLogSubscription = this.fileWatcherService.changeLog.subscribe(log => {
            this.changeLog = log;
        })

        this.autoImportActiveSubscription = this.fileWatcherService.autoImportActive.subscribe(autoImport => {
            this.autoImportActive = autoImport;
        })
    }

    ngOnDestroy() {
        this.fileNameSubscription.unsubscribe();
        this.fileMetaSubscription.unsubscribe();
        this.changeLogSubscription.unsubscribe();
        this.autoImportActiveSubscription.unsubscribe();
    }

    selectFile() {
        this.fileWatcherService.openFileDialog();
    }

    toggleAutoImport() {
        this.fileWatcherService.toggleAutoImport();
    }

    clearLog() {
        this.fileWatcherService.clearChangeLog();
    }
}
