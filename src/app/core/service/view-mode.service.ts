import {Injectable, NgZone, inject} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {ElectronService} from './electron.service';

export type ViewMode = 'simple' | 'advanced' | 'expert';

@Injectable({
  providedIn: 'root'
})
export class ViewModeService {
  private electronService = inject(ElectronService);
  private ngZone = inject(NgZone);

  private viewModeSubject = new BehaviorSubject<ViewMode>('simple');
  viewMode = this.viewModeSubject.asObservable();

  constructor() {
    this.initialize();
  }

  async setViewMode(mode: ViewMode): Promise<boolean> {
    if (!this.isValidViewMode(mode)) {
      return false;
    }

    if (!this.electronService.isElectron || !this.electronService.ipcRenderer) {
      this.viewModeSubject.next(mode);
      return true;
    }

    try {
      const result = await this.electronService.ipcRenderer.invoke('view-mode:set', mode);
      if (result?.success && this.isValidViewMode(result.viewMode)) {
        this.viewModeSubject.next(result.viewMode);
        return true;
      }
    } catch (error) {
      console.error('[ViewModeService] Failed to set view mode via IPC:', error);
    }

    return false;
  }

  isAllowed(allowedModes: ViewMode[], currentMode?: ViewMode): boolean {
    const mode = currentMode ?? this.viewModeSubject.value;
    return allowedModes.includes(mode);
  }

  private async initialize() {
    if (!this.electronService.isElectron || !this.electronService.ipcRenderer) {
      return;
    }

    this.electronService.ipcRenderer.on('view-mode:changed', (event: any, mode: unknown) => {
      if (!this.isValidViewMode(mode)) {
        return;
      }

      this.ngZone.run(() => {
        this.viewModeSubject.next(mode);
      });
    });

    try {
      const mode = await this.electronService.ipcRenderer.invoke('view-mode:get');
      if (this.isValidViewMode(mode)) {
        this.viewModeSubject.next(mode);
      }
    } catch (error) {
      console.warn('[ViewModeService] Failed to fetch initial view mode via IPC:', error);
    }
  }

  private isValidViewMode(mode: unknown): mode is ViewMode {
    return mode === 'simple' || mode === 'advanced' || mode === 'expert';
  }
}
