import {Component} from '@angular/core';
import {GroupBoxComponent} from '../../../layout/group-box/group-box.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';
import {CurrentHeatModel} from '../../../core/model/current-heat.model';
import {ConnectionState, State} from '../../../core/model/state.model';
import {ImportConfig} from '../../../core/model/import-config.model';
import {ElectronService} from '../../../core/service/electron.service';
import {ImportService} from '../../../core/service/import.service';
import {AlgeService} from '../../../core/service/alge.service';
import {FormsModule} from '@angular/forms';
import {getClassForConnectionState} from '../../../core/function/live-timing.functions';

@Component({
    selector: 'app-live-timing-old-view',
    imports: [
        GroupBoxComponent,
        TranslatePipe,
        FormsModule
    ],
    templateUrl: './live-timing-old-view.component.html',
    styleUrl: './live-timing-old-view.component.scss'
})
export class LiveTimingOldViewComponent {

    messageSubscription: Subscription;
    udpActiveSubscription: Subscription;
    currentHeatSubscription: Subscription;
    stateSubscription: Subscription;
    algeStateSubscription: Subscription;

    liveTimingActiveSubscription: Subscription;
    importConfigSubscription: Subscription;
    srStateSubscription: Subscription;

    udpActive: boolean = false;
    liveTimingActive: boolean = false;

    currentHeat: CurrentHeatModel = {} as CurrentHeatModel;
    state: State = State.NOT_RUNNING;
    algeState: ConnectionState = ConnectionState.DISCONNECTED;

    importConfig: ImportConfig = {} as ImportConfig;
    srState: ConnectionState | string = ConnectionState.DISCONNECTED;

    messages: string[] = [];

    udpPort: number = 26;
    udpAddress: string = "0.0.0.0";

    collectLog: boolean = false;

    constructor(
        private electronService: ElectronService,
        private algeService: AlgeService,
        private importService: ImportService,
        private translateService: TranslateService
    ) {
        this.messageSubscription = this.algeService.message.subscribe(msg => {
            if (this.collectLog)
                this.messages = [msg, ...this.messages];
        })

        this.udpActiveSubscription = this.algeService.udpActive.subscribe(state => {
            this.udpActive = state;
        })

        this.currentHeatSubscription = this.algeService.currentHeat.subscribe(heat => {
            this.currentHeat = heat;
        })

        this.stateSubscription = this.algeService.state.subscribe(state => {
            this.state = state;
        })

        this.algeStateSubscription = this.algeService.algeState.subscribe(state => {
            this.algeState = state;
        })

        // ---

        this.liveTimingActiveSubscription = this.importService.liveTimingActive.subscribe(state => {
            this.liveTimingActive = state;
        })

        this.srStateSubscription = this.importService.srState.subscribe(state => {
            this.srState = state;
        })

        this.importConfigSubscription = this.importService.config.subscribe(config => {
            this.importConfig = config;
        })
    }

    startUdp() {
        this.electronService.startUdpListener(this.udpPort, this.udpAddress);
    }

    stopUdp() {
        this.electronService.stopUdpListener();
    }

    startLiveTiming() {
        if (this.currentHeat) {
            this.algeService.setCurrentHeat(this.currentHeat);
        }
        this.importService.setLiveTimingActive(true);


        this.importService.sendPing();
    }

    stopLiveTiming() {
        this.importService.setLiveTimingActive(false);

    }

    electronInfo() {
        return this.electronService.isElectron ? 'Electron' : 'Web';
    }

    saveConfig() {
        this.importService.saveConfig(this.importConfig);
    }

    changeLanguage(lang: string) {
        this.translateService.use(lang);
    }

    toggleLog() {
        this.collectLog = !this.collectLog;
    }

    protected readonly getClassForConnectionState = getClassForConnectionState;

    openDisplay() {
        console.log('=== openDisplay() method called ===');
        console.log('electronService:', this.electronService);
        console.log('electronService.isElectron:', this.electronService.isElectron);

        this.electronService.openDisplayWindow().then((success) => {
            console.log('=== openDisplayWindow Promise resolved ===');
            console.log('Success:', success);
            if (success) {
                console.log('Display window opened successfully');
            } else {
                console.error('Failed to open display window');
            }
        }).catch((error) => {
            console.error('=== Promise rejected ===');
            console.error('Error:', error);
        });
    }
}
