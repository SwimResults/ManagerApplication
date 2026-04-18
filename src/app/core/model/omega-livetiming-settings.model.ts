export type OmegaParserMode = 'OSM6' | 'UNT4';

export interface OmegaLivetimingSettings {
  lapIntervalMeters: number; // How many meters constitute one lap
  parserMode: OmegaParserMode;
}

export class OmegaLivetimingSettingsImpl implements OmegaLivetimingSettings {
  lapIntervalMeters: number = 100; // Default: 100m per lap
  parserMode: OmegaParserMode = 'OSM6';

  constructor(settings?: Partial<OmegaLivetimingSettings>) {
    if (settings) {
      this.lapIntervalMeters = settings.lapIntervalMeters ?? 100;
      this.parserMode = settings.parserMode ?? 'OSM6';
    }
  }
}
