export interface OmegaLivetimingSettings {
  lapIntervalMeters: number; // How many meters constitute one lap
}

export class OmegaLivetimingSettingsImpl implements OmegaLivetimingSettings {
  lapIntervalMeters: number = 100; // Default: 100m per lap

  constructor(settings?: Partial<OmegaLivetimingSettings>) {
    if (settings) {
      this.lapIntervalMeters = settings.lapIntervalMeters ?? 100;
    }
  }
}
