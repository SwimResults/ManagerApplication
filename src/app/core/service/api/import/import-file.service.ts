import { Injectable, inject } from '@angular/core';
import {BaseService} from "../base.service";
import {environment} from "../../../../../environments/environment";
import {Observable, Subject} from "rxjs";
import {ApiService} from "../api.service";

export interface ImportFileRequest {
    url: string,
    text: string,
    file_extension: string,
    file_type: string,
    exclude_events: number[],
    include_events: number[],
    meeting: string,
    stream_id: string,
}

export interface ProgressEvent {
    current: number;
    total: number;
    percentage: number;
    message: string;
}

export interface LogEvent {
    message: string;
    level: string;
    timestamp: string;
}

@Injectable({
    providedIn: 'root'
})
export class ImportFileService extends BaseService {
    private apiService = inject(ApiService);
    private eventSource: EventSource | null = null;
    private streamActive = false;

    // Subjects for streaming data
    private progressSubject = new Subject<ProgressEvent>();
    private logSubject = new Subject<LogEvent>();
    private connectionSubject = new Subject<boolean>();

    // Public observables
    public progress$ = this.progressSubject.asObservable();
    public log$ = this.logSubject.asObservable();
    public connection$ = this.connectionSubject.asObservable();

    constructor() {
        super("ImportFileService", environment.api_urls.import_service)
    }

    public importFile(data: ImportFileRequest): Observable<any> {
        return this.apiService.post(this.API_URL, "file", data)
    }

    public readToPdfBeforeImport(data: ImportFileRequest): Observable<ImportFileRequest> {
        return this.apiService.post(this.API_URL, "pdf_to_text", data)
    }

    /**
     * Generate a unique session ID for the stream
     */
    public generateStreamId(): string {
        return crypto.randomUUID();
    }

    /**
     * Open SSE connection to the stream endpoint
     */
    public openStream(sessionId: string): void {
        if (this.streamActive) {
            console.warn('Stream already active');
            return;
        }

        const streamUrl = `${this.API_URL}stream/${sessionId}`;
        this.eventSource = new EventSource(streamUrl);
        this.streamActive = true;

        this.eventSource.onopen = () => {
            console.log('SSE connection opened');
            this.connectionSubject.next(true);
        };

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'progress') {
                    this.progressSubject.next(data.data as ProgressEvent);
                } else if (data.type === 'log') {
                    this.logSubject.next(data.data as LogEvent);
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            this.closeStream();
        };
    }

    /**
     * Close the SSE connection
     */
    public closeStream(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.streamActive = false;
        this.connectionSubject.next(false);
    }

    /**
     * Check if stream is currently active
     */
    public isStreamActive(): boolean {
        return this.streamActive;
    }
}
