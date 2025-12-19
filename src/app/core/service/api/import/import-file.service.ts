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
    session_id: string,
}

export interface ProgressEvent {
    type?: string;
    progress?: number;  // 0-100 from Go server
    message?: string;
    current?: number;   // for alternative format
    total?: number;     // for alternative format
    percentage?: number; // for alternative format
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
        data.session_id = this.currentStreamId;
        return this.apiService.post(this.API_URL, "file", data)
    }

    public readToPdfBeforeImport(data: ImportFileRequest): Observable<ImportFileRequest> {
        // Automatically set the stream_id from the active stream
        data.session_id = this.currentStreamId;
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

        // Start reading the stream in the background (don't await)
        this.readStream(response);
    }

    /**
     * Read SSE stream in the background
     */
    private async readStream(response: Response): Promise<void> {
        try {

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response body reader available');
            }

            // Buffer for incomplete lines
            let buffer = '';
            let readCount = 0;

            console.log('Starting to read SSE stream...');

            // Read the stream
            while (this.streamActive) {
                const { done, value } = await reader.read();
                readCount++;

                console.log(`Read iteration ${readCount}, done: ${done}, bytes: ${value?.length || 0}`);

                if (done) {
                    console.log('Stream done, exiting read loop');
                    break;
                }

                // Decode and append to buffer
                const chunk = decoder.decode(value, { stream: true });
                console.log('Received chunk:', chunk);
                buffer += chunk;

                // Split by double newline (SSE message separator) or single newline
                const lines = buffer.split('\n');

                // Keep the last incomplete line in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    // Skip empty lines
                    if (!trimmedLine) {
                        continue;
                    }

                    console.log('SSE line received:', trimmedLine);

                    if (trimmedLine.startsWith('data:')) {
                        const dataStr = trimmedLine.substring(5).trim();
                        try {
                            const data = JSON.parse(dataStr);

                            console.log('Parsed SSE data:', data);

                            // Handle both nested and flat data structures
                            if (data.type === 'progress') {
                                const progressData = data.data || data;
                                this.progressSubject.next(progressData as ProgressEvent);
                            } else if (data.type === 'log') {
                                const logData = data.data || data;
                                this.logSubject.next(logData as LogEvent);
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
