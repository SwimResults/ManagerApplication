import {Injectable, NgZone, inject} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {ElectronService} from './electron.service';

export type SerialParity = 'none' | 'even' | 'odd' | 'mark' | 'space';

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  vendorId?: string;
  productId?: string;
}

export interface SerialPortConfig {
  path: string;
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: SerialParity;
}

export interface SerialMessage {
  message: string;
  hexDump: string;
  bytes: number[];
  byteLength: number;
  timestamp: string;
}

export interface SerialConnectionStatus {
  isListening: boolean;
  portPath: string | null;
  error: string | null;
}

interface SerialCommandResult {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SerialComService {
  private electronService = inject(ElectronService);
  private ngZone = inject(NgZone);

  private statusSubject = new BehaviorSubject<SerialConnectionStatus>({
    isListening: false,
    portPath: null,
    error: null
  });

  private messageSubject = new Subject<SerialMessage>();

  status = this.statusSubject.asObservable();
  messages = this.messageSubject.asObservable();

  constructor() {
    this.initialize();
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    const ipcRenderer = this.getIpcRenderer();
    if (!ipcRenderer) {
      return [];
    }

    try {
      const ports = await ipcRenderer.invoke('serial:list-ports');
      if (Array.isArray(ports)) {
        return ports;
      }
    } catch (error) {
      console.error('[SerialComService] Failed to list serial ports:', error);
    }

    return [];
  }

  async startListening(config: SerialPortConfig): Promise<SerialCommandResult> {
    const ipcRenderer = this.getIpcRenderer();
    if (!ipcRenderer) {
      return {success: false, error: 'Electron IPC is not available.'};
    }

    try {
      const result = await ipcRenderer.invoke('serial:start-listening', config);
      return this.normalizeResult(result);
    } catch (error) {
      console.error('[SerialComService] Failed to start serial listener:', error);
      return {success: false, error: this.errorToMessage(error)};
    }
  }

  async stopListening(): Promise<SerialCommandResult> {
    const ipcRenderer = this.getIpcRenderer();
    if (!ipcRenderer) {
      return {success: false, error: 'Electron IPC is not available.'};
    }

    try {
      const result = await ipcRenderer.invoke('serial:stop-listening');
      return this.normalizeResult(result);
    } catch (error) {
      console.error('[SerialComService] Failed to stop serial listener:', error);
      return {success: false, error: this.errorToMessage(error)};
    }
  }

  private initialize() {
    const ipcRenderer = this.getIpcRenderer();
    if (!ipcRenderer) {
      return;
    }

    ipcRenderer.on('serial:status', (event: any, status: Partial<SerialConnectionStatus>) => {
      this.ngZone.run(() => {
        this.statusSubject.next({
          isListening: Boolean(status.isListening),
          portPath: status.portPath ?? null,
          error: status.error ?? null
        });
      });
    });

    ipcRenderer.on('serial:message', (event: any, payload: Partial<SerialMessage>) => {
      const message = typeof payload.message === 'string' ? payload.message : '';
      const hexDump = typeof payload.hexDump === 'string' ? payload.hexDump : '';
      const bytes = Array.isArray(payload.bytes) ? payload.bytes.map(byte => Number(byte)).filter(byte => Number.isFinite(byte)) : [];
      const byteLength = Number.isFinite(payload.byteLength) ? Number(payload.byteLength) : 0;
      const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : new Date().toISOString();

      if (!message && !hexDump && bytes.length === 0) {
        return;
      }

      this.ngZone.run(() => {
        this.messageSubject.next({message, hexDump, bytes, byteLength, timestamp});
      });
    });

    ipcRenderer.on('serial:error', (event: any, errorMessage: unknown) => {
      const error = typeof errorMessage === 'string' ? errorMessage : 'Unknown serial error';
      this.ngZone.run(() => {
        const current = this.statusSubject.value;
        this.statusSubject.next({...current, error});
      });
    });

    this.fetchInitialStatus(ipcRenderer);
  }

  private async fetchInitialStatus(ipcRenderer: any) {
    try {
      const status = await ipcRenderer.invoke('serial:get-status');
      this.ngZone.run(() => {
        this.statusSubject.next({
          isListening: Boolean(status?.isListening),
          portPath: status?.portPath ?? null,
          error: status?.error ?? null
        });
      });
    } catch (error) {
      console.warn('[SerialComService] Failed to fetch initial serial status:', error);
    }
  }

  private getIpcRenderer(): any {
    if (!this.electronService.isElectron || !this.electronService.ipcRenderer) {
      return null;
    }

    return this.electronService.ipcRenderer;
  }

  private normalizeResult(result: unknown): SerialCommandResult {
    if (result && typeof result === 'object' && 'success' in result) {
      const typedResult = result as SerialCommandResult;
      return {
        success: Boolean(typedResult.success),
        error: typedResult.error
      };
    }

    return {success: false, error: 'Unexpected IPC response.'};
  }

  private errorToMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
