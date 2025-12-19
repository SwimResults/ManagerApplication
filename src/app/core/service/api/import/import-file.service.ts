import { Injectable, inject } from '@angular/core';
import {BaseService} from "../base.service";
import {environment} from "../../../../../environments/environment";
import {Observable, Subject} from "rxjs";
import {ApiService} from "../api.service";
import {OAuthService} from "angular-oauth2-oidc";

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
    private oAuthService = inject(OAuthService);
    private eventSource: EventSource | null = null;
    private streamActive = false;
    private abortController: AbortController | null = null;
    private currentStreamId: string = '';

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

    /**
     * Get the authorization header for SSE connection
     */
    private getAuthHeader(): string | null {
        if (!this.oAuthService.hasValidIdToken()) {
            console.log('No valid token for SSE connection');
            return null;
        }
        return this.oAuthService.authorizationHeader();
    }

    public importFile(data: ImportFileRequest): Observable<any> {
        // Automatically set the stream_id from the active stream
        data.stream_id = this.currentStreamId;
        return this.apiService.post(this.API_URL, "file", data)
    }

    public readToPdfBeforeImport(data: ImportFileRequest): Observable<ImportFileRequest> {
        // Automatically set the stream_id from the active stream
        data.stream_id = this.currentStreamId;
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
    public async openStream(sessionId: string): Promise<void> {
        if (this.streamActive) {
            console.warn('Stream already active');
            return;
        }

        this.currentStreamId = sessionId;
        const streamUrl = `${this.API_URL}stream/${sessionId}`;
        const authHeader = this.getAuthHeader();

        this.abortController = new AbortController();
        this.streamActive = true;

        try {
            const response = await fetch(streamUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/event-stream',
                    ...(authHeader ? { 'Authorization': authHeader } : {})
                },
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('SSE connection opened');
            this.connectionSubject.next(true);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body reader available');
            }

            // Read the stream
            while (this.streamActive) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        try {
                            const data = JSON.parse(dataStr);

                            if (data.type === 'progress') {
                                this.progressSubject.next(data.data as ProgressEvent);
                            } else if (data.type === 'log') {
                                this.logSubject.next(data.data as LogEvent);
                            }
                        } catch (error) {
                            console.error('Error parsing SSE message:', error, dataStr);
                        }
                    }
                }
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('SSE connection error:', error);
            }
            this.closeStream();
        }
    }

    /**
     * Close the SSE connection
     */
    public closeStream(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.streamActive = false;
        this.currentStreamId = '';
        this.connectionSubject.next(false);
    }

    /**
     * Check if stream is currently active
     */
    public isStreamActive(): boolean {
        return this.streamActive;
    }

    /**
     * Get the current stream ID
     */
    public getCurrentStreamId(): string {
        return this.currentStreamId;
    }
}
