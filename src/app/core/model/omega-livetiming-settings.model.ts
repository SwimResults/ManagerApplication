import type {SerialParity} from '../service/serial-com.service';

export type OmegaParserMode = 'OSM6' | 'UNT4';

export interface OmegaLivetimingSettings {
  selectedPortPath: string;
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: SerialParity;
  lapIntervalMeters: number;
  parserMode: OmegaParserMode;
}

export class OmegaLivetimingSettingsImpl implements OmegaLivetimingSettings {
  selectedPortPath = '';
  baudRate = 9600;
  dataBits: 5 | 6 | 7 | 8 = 8;
  stopBits: 1 | 2 = 1;
  parity: SerialParity = 'none';
  lapIntervalMeters = 100;
  parserMode: OmegaParserMode = 'OSM6';

  constructor(settings?: Partial<OmegaLivetimingSettings>) {
    if (settings) {
      this.selectedPortPath = settings.selectedPortPath ?? '';
      this.baudRate = settings.baudRate ?? 9600;
      this.dataBits = settings.dataBits ?? 8;
      this.stopBits = settings.stopBits ?? 1;
      this.parity = settings.parity ?? 'none';
      this.lapIntervalMeters = settings.lapIntervalMeters ?? 100;
      this.parserMode = settings.parserMode ?? 'OSM6';
    }
  }
}
