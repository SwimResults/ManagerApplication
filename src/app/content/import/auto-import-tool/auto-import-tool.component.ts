import {Component, Input, inject, OnDestroy, OnInit} from '@angular/core';
import {FileMetadata, FileWatcherService} from '../../../core/service/file-watcher.service';
import {Subscription} from 'rxjs';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatIcon} from "@angular/material/icon";

@Component({
  selector: 'sr-auto-import-tool',
    imports: [
        MatSlideToggle,
        MatIcon
    ],
  templateUrl: './auto-import-tool.component.html',
  styleUrl: './auto-import-tool.component.scss'
})
export class AutoImportToolComponent implements OnDestroy, OnInit {
    @Input() importerId: number = 1;

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
        this.fileNameSubscription = new Subscription();
        this.fileMetaSubscription = new Subscription();
        this.changeLogSubscription = new Subscription();
        this.autoImportActiveSubscription = new Subscription();
    }

    ngOnInit(): void {
        this.fileNameSubscription = this.fileWatcherService.currentFilePath$(this.importerId).subscribe(path => {
            this.fileName = path;
        })

        this.fileMetaSubscription = this.fileWatcherService.fileMetadata$(this.importerId).subscribe(meta => {
            this.fileMeta = meta;
        })

        this.changeLogSubscription = this.fileWatcherService.changeLog$(this.importerId).subscribe(log => {
            this.changeLog = log;
        })

        this.autoImportActiveSubscription = this.fileWatcherService.autoImportActive$(this.importerId).subscribe(autoImport => {
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
        this.fileWatcherService.openFileDialog(this.importerId);
    }

    toggleAutoImport() {
        this.fileWatcherService.toggleAutoImport(this.importerId);
    }

    clearLog() {
        this.fileWatcherService.clearChangeLog(this.importerId);
    }
}
