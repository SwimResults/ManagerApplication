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
    // Per-importer state
    private filePathsMap = new Map<number, BehaviorSubject<string | null>>();
    private fileMetadataMap = new Map<number, BehaviorSubject<FileMetadata | null>>();
    private autoImportActiveMap = new Map<number, BehaviorSubject<boolean>>();
    private watcherSubscriptionsMap = new Map<number, Subscription>();
    private lastModifiedTimeMap = new Map<number, number>();
    private autoImportInProgressMap = new Map<number, boolean>();
    private changeLogMap = new Map<number, BehaviorSubject<string[]>>();

    // Global state
    private meetingSubscription?: Subscription;
    private streamCompletionSubscriptionsMap = new Map<number, Subscription>();
    private currentMeetingId: string | null = null;
    private readonly autoImportFeatures: string[] = [
        'event',
        //'age_group',
        'heat',
        'result',
        'disqualification'
    ];
    private autoImportListType = 'result_list';

    constructor(
        private electronService: ElectronService,
        private importFileService: ImportFileService,
        private currentMeetingService: CurrentMeetingService
    ) {
        this.meetingSubscription = this.currentMeetingService.currentMeeting.subscribe(meeting => {
            this.currentMeetingId = meeting?.meet_id || null;
        });
    }

    // Get or create observables for a specific importer
    private getOrCreateFilePath$(importerId: number): BehaviorSubject<string | null> {
        if (!this.filePathsMap.has(importerId)) {
            this.filePathsMap.set(importerId, new BehaviorSubject<string | null>(null));
        }
        return this.filePathsMap.get(importerId)!;
    }

    private getOrCreateFileMetadata$(importerId: number): BehaviorSubject<FileMetadata | null> {
        if (!this.fileMetadataMap.has(importerId)) {
            this.fileMetadataMap.set(importerId, new BehaviorSubject<FileMetadata | null>(null));
        }
        return this.fileMetadataMap.get(importerId)!;
    }

    private getOrCreateAutoImportActive$(importerId: number): BehaviorSubject<boolean> {
        if (!this.autoImportActiveMap.has(importerId)) {
            this.autoImportActiveMap.set(importerId, new BehaviorSubject<boolean>(false));
        }
        return this.autoImportActiveMap.get(importerId)!;
    }

    private getOrCreateChangeLog$(importerId: number): BehaviorSubject<string[]> {
        if (!this.changeLogMap.has(importerId)) {
            this.changeLogMap.set(importerId, new BehaviorSubject<string[]>([]));
        }
        return this.changeLogMap.get(importerId)!;
    }

    // Public observable getters for specific importer
    currentFilePath$(importerId: number): Observable<string | null> {
        return this.getOrCreateFilePath$(importerId).asObservable();
    }

    fileMetadata$(importerId: number): Observable<FileMetadata | null> {
        return this.getOrCreateFileMetadata$(importerId).asObservable();
    }

    changeLog$(importerId: number): Observable<string[]> {
        return this.getOrCreateChangeLog$(importerId).asObservable();
    }

    autoImportActive$(importerId: number): Observable<boolean> {
        return this.getOrCreateAutoImportActive$(importerId).asObservable();
    }

    clearChangeLog(importerId: number): void {
        this.getOrCreateChangeLog$(importerId).next([]);
    }

    setAutoImportActive(importerId: number, active: boolean): void {
        const subject = this.getOrCreateAutoImportActive$(importerId);
        if (subject.getValue() === active) {
            return;
        }

        subject.next(active);
        this.appendToLog(importerId, `Auto import ${active ? 'aktiviert' : 'deaktiviert'}`);
    }

    enableAutoImport(importerId: number): void {
        this.setAutoImportActive(importerId, true);
    }

    disableAutoImport(importerId: number): void {
        this.setAutoImportActive(importerId, false);
    }

    toggleAutoImport(importerId: number): void {
        this.setAutoImportActive(importerId, !this.getOrCreateAutoImportActive$(importerId).getValue());
    }

    async openFileDialog(importerId: number): Promise<void> {
        const filePath = await this.electronService.openFileDialog();

        if (filePath) {
            this.setFile(importerId, filePath);
        }
    }

    private setFile(importerId: number, filePath: string): void {
        // Stop any existing watcher for this importer
        this.stopWatching(importerId);

        // Update current file path
        this.getOrCreateFilePath$(importerId).next(filePath);

        // Initialize metadata
        this.updateFileMetadata(importerId, filePath);

        // Start watching the file
        this.startWatching(importerId, filePath);
    }

    private startWatching(importerId: number, filePath: string): void {
        // Check file every 10 seconds
        const subscription = interval(10000).subscribe({
            next: () => {
                this.checkFileChanges(importerId, filePath).catch(error => {
                    console.error('Error while checking file changes:', error);
                });
            }
        });

        this.watcherSubscriptionsMap.set(importerId, subscription);
    }

    private stopWatching(importerId: number): void {
        const subscription = this.watcherSubscriptionsMap.get(importerId);
        if (subscription) {
            subscription.unsubscribe();
            this.watcherSubscriptionsMap.delete(importerId);
        }
    }

    private updateFileMetadata(importerId: number, filePath: string): void {
        const stats = this.electronService.getFileStats(filePath);

        if (stats) {
            const metadata: FileMetadata = {
                size: stats.size,
                lastModified: stats.mtime
            };

            this.appendToLog(importerId, `Dateiupdate erkannt um ${metadata.lastModified.toLocaleString()}`);

            this.getOrCreateFileMetadata$(importerId).next(metadata);
            this.lastModifiedTimeMap.set(importerId, stats.mtimeMs);
        }
    }

    private async checkFileChanges(importerId: number, filePath: string): Promise<void> {
        const stats = this.electronService.getFileStats(filePath);

        if (!stats) {
            console.warn('File not found or cannot be accessed:', filePath);
            return;
        }

        const lastModified = this.lastModifiedTimeMap.get(importerId) || 0;

        // Check if file has been modified
        if (stats.mtimeMs !== lastModified) {
            console.log('File changed detected!');

            // Update metadata
            this.updateFileMetadata(importerId, filePath);

            await this.handleAutoImport(importerId, filePath);

            // Read and print first 10 lines
            const lines = this.electronService.readFileLines(filePath, 10);
            console.log('Erste 10 Zeilen der Datei:');
            lines.forEach((line, index) => {
                console.log(`${index + 1}: ${line}`);
            });
        }
    }

    private async handleAutoImport(importerId: number, filePath: string): Promise<void> {
        if (!this.getOrCreateAutoImportActive$(importerId).getValue()) {
            return;
        }

        if (this.autoImportInProgressMap.get(importerId)) {
            this.appendToLog(importerId, 'Automatischer Import übersprungen, da bereits ein Import läuft');
            return;
        }

        if (!this.currentMeetingId) {
            this.appendToLog(importerId, 'Automatischer Import übersprungen, da kein Wettkampf ausgewählt ist');
            return;
        }

        const fileExtension = this.detectFileExtension(filePath);
        if (!fileExtension) {
            this.appendToLog(importerId, 'Automatischer Import übersprungen, da der Dateityp nicht erkannt werden konnte');
            return;
        }

        const file = this.createFileFromPath(filePath, fileExtension);
        if (!file) {
            this.appendToLog(importerId, 'Automatischer Import übersprungen, da die Datei nicht gelesen werden konnte');
            return;
        }

        await this.executeAutoImport(importerId, file, fileExtension);
    }

    private async executeAutoImport(importerId: number, file: File, fileExtension: string): Promise<void> {
        // Guard: ensure we have a meeting ID
        if (!this.currentMeetingId) {
            this.appendToLog(importerId, 'Automatischer Import übersprungen, da kein Wettkampf ausgewählt ist');
            return;
        }

        // Reset and prepare stream
        this.importFileService.closeStream();
        const sessionId = this.importFileService.generateStreamId();

        this.autoImportInProgressMap.set(importerId, true);
        this.resetStreamCompletionWatcher(importerId);

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
            this.setupStreamCompletionWatcher(importerId);
            this.appendToLog(importerId, 'Automatischer Import gestartet');

            await firstValueFrom(this.importFileService.importFile(request, file));
            //this.appendToLog(importerId, 'Automatischer Import abgeschlossen');
        } catch (error) {
            console.error('Auto import failed', error);
            this.appendToLog(importerId, 'Automatischer Import fehlgeschlagen; siehe Konsole für Details');
            this.finishAutoImport(importerId, true);
        }
    }

    private setupStreamCompletionWatcher(importerId: number): void {
        const sub = new Subscription();

        sub.add(this.importFileService.progress$.subscribe(event => {
            const pct = this.extractProgress(event);
            if (pct >= 100) {
                this.appendToLog(importerId, 'Automatischer Import abgeschlossen');
                this.finishAutoImport(importerId, true);
            }
        }));

        sub.add(this.importFileService.connection$.subscribe(active => {
            if (!active) {
                this.finishAutoImport(importerId, false);
            }
        }));

        this.streamCompletionSubscriptionsMap.set(importerId, sub);
    }

    private resetStreamCompletionWatcher(importerId: number): void {
        const subscription = this.streamCompletionSubscriptionsMap.get(importerId);
        if (subscription) {
            subscription.unsubscribe();
            this.streamCompletionSubscriptionsMap.delete(importerId);
        }
    }

    private finishAutoImport(importerId: number, closeStream: boolean): void {
        const autoImportInProgress = this.autoImportInProgressMap.get(importerId) || false;
        if (!autoImportInProgress) {
            return;
        }

        this.autoImportInProgressMap.set(importerId, false);
        this.resetStreamCompletionWatcher(importerId);

        if (closeStream) {
            this.importFileService.closeStream();
        }
    }

    private extractProgress(event: any): number {
        if (!event) {
            return 0;
        }
        if (typeof event.progress === 'number') {
            return event.progress;
        }
        if (typeof event.percentage === 'number') {
            return event.percentage;
        }
        if (typeof event.current === 'number' && typeof event.total === 'number' && event.total > 0) {
            return (event.current / event.total) * 100;
        }
        return 0;
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
            const lastModified = Array.from(this.lastModifiedTimeMap.values())[0] || Date.now();
            return new File([new Uint8Array(fileBuffer)], fileName, {
                type: mimeType,
                lastModified: lastModified
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

    private appendToLog(importerId: number, message: string): void {
        const log = `${new Date().toLocaleString()} > ${message}`;
        const subject = this.getOrCreateChangeLog$(importerId);
        subject.next([...subject.getValue(), log]);
    }

    clearFile(importerId: number): void {
        this.stopWatching(importerId);
        this.getOrCreateFilePath$(importerId).next(null);
        this.getOrCreateFileMetadata$(importerId).next(null);
        this.lastModifiedTimeMap.delete(importerId);
    }

    ngOnDestroy(): void {
        // Clean up all watchers
        this.watcherSubscriptionsMap.forEach(sub => sub.unsubscribe());
        this.watcherSubscriptionsMap.clear();

        // Clean up all stream completion watchers
        this.streamCompletionSubscriptionsMap.forEach(sub => sub.unsubscribe());
        this.streamCompletionSubscriptionsMap.clear();

        if (this.meetingSubscription) {
            this.meetingSubscription.unsubscribe();
        }
    }
}

