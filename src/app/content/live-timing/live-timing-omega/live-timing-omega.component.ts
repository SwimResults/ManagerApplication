import {Component} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {GroupBoxComponent} from '../../../layout/group-box/group-box.component';
import {CurrentHeatModel} from '../../../core/model/current-heat.model';
import {ConnectionState, State} from '../../../core/model/state.model';
import {ImportConfig} from '../../../core/model/import-config.model';
import {ElectronService} from '../../../core/service/electron.service';
import {ImportService} from '../../../core/service/import.service';
import {OmegaService} from '../../../core/service/omega.service';
import {SerialConnectionStatus, SerialParity, SerialPortInfo} from '../../../core/service/serial-com.service';
import {getClassForConnectionState} from '../../../core/function/live-timing.functions';
import {createEmptyCurrentHeat} from '../../../core/service/timing-state.service';
import {OmegaParserMode} from '../../../core/model/omega-livetiming-settings.model';

@Component({
  selector: 'sr-live-timing-omega',
  imports: [
    FormsModule,
    GroupBoxComponent,
    TranslatePipe
  ],
  templateUrl: './live-timing-omega.component.html',
  styleUrl: './live-timing-omega.component.scss'
})
export class LiveTimingOmegaComponent {
  ports: SerialPortInfo[] = [];
  messages: string[] = [];

  selectedPortPath = '';
  baudRate = 9600;
  dataBits: 5 | 6 | 7 | 8 = 8;
  stopBits: 1 | 2 = 1;
  parity: SerialParity = 'none';
  lapIntervalMeters = 100;
  parserMode: OmegaParserMode = 'OSM6';

  isLoadingPorts = false;
  isBusy = false;
  status: SerialConnectionStatus = {
    isListening: false,
    portPath: null,
    error: null
  };

  currentHeat: CurrentHeatModel = createEmptyCurrentHeat();
  state: State = State.NOT_RUNNING;
  omegaState: ConnectionState = ConnectionState.DISCONNECTED;
  liveTimingActive = false;
  importConfig: ImportConfig = {} as ImportConfig;
  srState: ConnectionState | string = ConnectionState.DISCONNECTED;
  collectLog = false;

  readonly dataBitOptions: Array<5 | 6 | 7 | 8> = [5, 6, 7, 8];
  readonly stopBitOptions: Array<1 | 2> = [1, 2];
  readonly parityOptions: SerialParity[] = ['none', 'even', 'odd', 'mark', 'space'];
  readonly parserModeOptions: OmegaParserMode[] = ['OSM6', 'UNT4'];

  private statusSubscription: Subscription;
  private messageSubscription: Subscription;
  private currentHeatSubscription: Subscription;
  private stateSubscription: Subscription;
  private omegaStateSubscription: Subscription;
  private liveTimingActiveSubscription: Subscription;
  private importConfigSubscription: Subscription;
  private srStateSubscription: Subscription;

  constructor(
    private electronService: ElectronService,
    private omegaService: OmegaService,
    private importService: ImportService,
    private translateService: TranslateService
  ) {
    this.statusSubscription = this.omegaService.serialStatus.subscribe(status => {
      this.status = status;
      if (status.portPath) {
        this.selectedPortPath = status.portPath;
      }
    });

    this.messageSubscription = this.omegaService.message.subscribe(msg => {
      if (this.collectLog) {
        this.messages = [msg, ...this.messages];
      }
    });

    this.currentHeatSubscription = this.omegaService.currentHeat.subscribe(heat => {
      this.currentHeat = heat;
    });

    this.stateSubscription = this.omegaService.state.subscribe(state => {
      this.state = state;
    });

    this.omegaStateSubscription = this.omegaService.omegaState.subscribe(state => {
      this.omegaState = state;
    });

    this.liveTimingActiveSubscription = this.importService.liveTimingActive.subscribe(state => {
      this.liveTimingActive = state;
    });

    this.srStateSubscription = this.importService.srState.subscribe(state => {
      this.srState = state;
    });

    this.lapIntervalMeters = this.omegaService.getLapIntervalMeters();
    this.parserMode = this.omegaService.getParserMode();

    this.importConfigSubscription = this.importService.config.subscribe(config => {
      this.importConfig = config;
    });

    this.refreshPorts();
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
    this.messageSubscription.unsubscribe();
    this.currentHeatSubscription.unsubscribe();
    this.stateSubscription.unsubscribe();
    this.omegaStateSubscription.unsubscribe();
    this.liveTimingActiveSubscription.unsubscribe();
    this.importConfigSubscription.unsubscribe();
    this.srStateSubscription.unsubscribe();
  }

  async refreshPorts() {
    this.isLoadingPorts = true;
    try {
      this.ports = await this.omegaService.listPorts();
      if (!this.selectedPortPath && this.ports.length > 0) {
        this.selectedPortPath = this.ports[0].path;
      }
    } finally {
      this.isLoadingPorts = false;
    }
  }

  async startOmega() {
    if (!this.selectedPortPath || this.isBusy) {
      return;
    }

    this.isBusy = true;
    try {
      const result = await this.omegaService.startListening({
        path: this.selectedPortPath,
        baudRate: Number(this.baudRate),
        dataBits: this.dataBits,
        stopBits: this.stopBits,
        parity: this.parity
      });

      if (!result.success) {
        this.pushSystemMessage(`Failed to start listener: ${result.error ?? 'Unknown error'}`);
      }
    } finally {
      this.isBusy = false;
    }
  }

  async stopOmega() {
    if (this.isBusy) {
      return;
    }

    this.isBusy = true;
    try {
      const result = await this.omegaService.stopListening();
      if (!result.success) {
        this.pushSystemMessage(`Failed to stop listener: ${result.error ?? 'Unknown error'}`);
      }
    } finally {
      this.isBusy = false;
    }
  }

  startLiveTiming() {
    this.omegaService.setCurrentHeat(this.currentHeat);
    this.importService.setLiveTimingActive(true);
    this.importService.sendPing();
  }

  stopLiveTiming() {
    this.importService.setLiveTimingActive(false);
  }

  saveConfig() {
    this.importService.saveConfig(this.importConfig);
  }

  changeLanguage(lang: string) {
    this.translateService.use(lang);
  }

  updateLapIntervalMeters() {
    this.omegaService.setLapIntervalMeters(Number(this.lapIntervalMeters));
  }

  updateParserMode() {
    this.omegaService.setParserMode(this.parserMode);
  }

  toggleLog() {
    this.collectLog = !this.collectLog;
  }

  clearMessages() {
    this.messages = [];
  }

  openDisplay() {
    this.electronService.openDisplayWindow();
  }

  trackByPort(index: number, port: SerialPortInfo): string {
    return port.path;
  }

  trackByMessage(index: number, message: string): string {
    return `${index}-${message}`;
  }

  protected readonly getClassForConnectionState = getClassForConnectionState;

  private pushSystemMessage(message: string) {
    this.messages = [message, ...this.messages];
  }

}
