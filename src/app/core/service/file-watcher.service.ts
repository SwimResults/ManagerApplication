import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, firstValueFrom, interval, Observable, Subscription} from 'rxjs';
import {ElectronService} from './electron.service';
import {ImportFileRequest, ImportFileService} from './api/import/import-file.service';
import {CurrentMeetingService} from './current-meeting.service';

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
    private changeLogSubject = new BehaviorSubject<string[]>([]);
    private autoImportActiveSubject = new BehaviorSubject<boolean>(false);
    private watcherSubscription?: Subscription;
    private meetingSubscription?: Subscription;
    private lastModifiedTime: number = 0;
    private autoImportInProgress = false;
    private currentMeetingId: string | null = null;
    private readonly autoImportFeatures: string[] = [
        'event',
        //'age_group',
        'heat',
        'result',
        'disqualification'
    ];
    private autoImportListType = 'result_list';

    currentFilePath: Observable<string | null> = this.currentFilePathSubject.asObservable();
    fileMetadata: Observable<FileMetadata | null> = this.fileMetadataSubject.asObservable();
    changeLog: Observable<string[]> = this.changeLogSubject.asObservable();
    autoImportActive: Observable<boolean> = this.autoImportActiveSubject.asObservable();

    constructor(
        private electronService: ElectronService,
        private importFileService: ImportFileService,
        private currentMeetingService: CurrentMeetingService
    ) {
        this.meetingSubscription = this.currentMeetingService.currentMeeting.subscribe(meeting => {
            this.currentMeetingId = meeting?.meet_id || null;
        });
    }

    clearChangeLog() {
        this.changeLogSubject.next([]);
    }

    setAutoImportActive(active: boolean): void {
        if (this.autoImportActiveSubject.getValue() === active) {
            return;
        }

        this.autoImportActiveSubject.next(active);
        this.appendToLog(`Auto import ${active ? 'aktiviert' : 'deaktiviert'}`);
    }

    enableAutoImport(): void {
        this.setAutoImportActive(true);
    }

    disableAutoImport(): void {
        this.setAutoImportActive(false);
    }

    toggleAutoImport(): void {
        this.setAutoImportActive(!this.autoImportActiveSubject.getValue());
    }

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
        this.watcherSubscription = interval(10000).subscribe({
            next: () => {
                this.checkFileChanges(filePath).catch(error => {
                    console.error('Error while checking file changes:', error);
                });
            }
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

            this.appendToLog(`File update detected at ${metadata.lastModified.toISOString()}`);

            this.fileMetadataSubject.next(metadata);
            this.lastModifiedTime = stats.mtimeMs;
        }
    }

    private async checkFileChanges(filePath: string): Promise<void> {
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

            await this.handleAutoImport(filePath);

            // Read and print first 10 lines
            const lines = this.electronService.readFileLines(filePath, 10);
            console.log('First 10 lines of the file:');
            lines.forEach((line, index) => {
                console.log(`${index + 1}: ${line}`);
            });
        }
    }

    private async handleAutoImport(filePath: string): Promise<void> {
        if (!this.autoImportActiveSubject.getValue()) {
            return;
        }

        if (this.autoImportInProgress) {
            this.appendToLog('Auto import skipped because an import is already running');
            return;
        }

        if (!this.currentMeetingId) {
            this.appendToLog('Auto import skipped because no meeting is selected');
            return;
        }

        const fileExtension = this.detectFileExtension(filePath);
        if (!fileExtension) {
            this.appendToLog('Auto import skipped because the file type could not be detected');
            return;
        }

        const file = this.createFileFromPath(filePath, fileExtension);
        if (!file) {
            this.appendToLog('Auto import skipped because the file could not be read');
            return;
        }

        this.autoImportInProgress = true;

        // Reset and prepare stream
        this.importFileService.closeStream();
        const sessionId = this.importFileService.generateStreamId();

        const request: ImportFileRequest = {
            url: '',
            text: '',
            file_extension: fileExtension.toUpperCase(),
            file_type: this.autoImportListType.toUpperCase(),
            exclude_events: [],
            include_events: [],
            meeting: this.currentMeetingId,
            session_id: sessionId,
            features: [...this.autoImportFeatures]
        };

        try {
            await this.importFileService.openStream(sessionId);
            this.appendToLog('Auto import started');

            await firstValueFrom(this.importFileService.importFile(request, file));
            this.appendToLog('Auto import finished');
        } catch (error) {
            console.error('Auto import failed', error);
            this.appendToLog('Auto import failed; see console for details');
        } finally {
            this.autoImportInProgress = false;
        }
    }

    private detectFileExtension(filePath: string): string | null {
        const lower = filePath.toLowerCase();

        if (lower.endsWith('.lef') || lower.endsWith('.lxf')) {
            return 'LEF';
        }

        if (lower.endsWith('.dsv') || lower.endsWith('.dsv6') || lower.endsWith('.dsv7')) {
            return 'DSV';
        }

        if (lower.endsWith('.pdf')) {
            return 'PDF';
        }

        if (lower.endsWith('.txt')) {
            return 'PDF_TXT';
        }

        return null;
    }

    private createFileFromPath(filePath: string, extension: string): File | null {
        if (!this.electronService.isElectron || !this.electronService.fs) {
            return null;
        }

        try {
            const fileBuffer = this.electronService.fs.readFileSync(filePath);
            const fileName = this.extractFileName(filePath);
            const mimeType = this.mapExtensionToMimeType(extension);

            // Wrap Node buffer as Uint8Array to satisfy File ctor typing
            return new File([new Uint8Array(fileBuffer)], fileName, {
                type: mimeType,
                lastModified: this.lastModifiedTime || Date.now()
            });
        } catch (error) {
            console.error('Error preparing file for import:', error);
            return null;
        }
    }

    private extractFileName(filePath: string): string {
        const parts = filePath.split(/[/\\]/);
        return parts[parts.length - 1] || 'import-file';
    }

    private mapExtensionToMimeType(extension: string): string {
        switch (extension) {
            case 'pdf':
                return 'application/pdf';
            case 'lef':
            case 'lxf':
            case 'dsv':
            case 'dsv6':
            case 'dsv7':
            case 'pdf_txt':
                return 'text/plain';
            default:
                return 'application/octet-stream';
        }
    }

    private appendToLog(message: string): void {
        const log = `${new Date().toISOString()} > ${message}`;
        this.changeLogSubject.next([...this.changeLogSubject.getValue(), log]);
    }

    clearFile(): void {
        this.stopWatching();
        this.currentFilePathSubject.next(null);
        this.fileMetadataSubject.next(null);
        this.lastModifiedTime = 0;
    }

    ngOnDestroy(): void {
        this.stopWatching();

        if (this.meetingSubscription) {
            this.meetingSubscription.unsubscribe();
        }
    }
}

