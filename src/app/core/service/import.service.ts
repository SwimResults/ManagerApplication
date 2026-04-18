import {inject, Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable, PartialObserver, Subscription, throwError} from 'rxjs';
import {ImportConfig} from '../model/import-config.model';
import {ConnectionState} from '../model/state.model';
import {HttpClient} from '@angular/common/http';
import {MeetingImpl} from '../model/meeting/meeting.model';
import {CurrentMeetingService} from './current-meeting.service';

@Injectable({
    providedIn: 'root',
})
export class ImportService implements OnDestroy {
    private audioContext: AudioContext | null = null;
    private configSubject = new BehaviorSubject<ImportConfig>({
        apiUrl: "https://api.swimresults.de/",
        password: ""
    } as ImportConfig);
    public config = this.configSubject.asObservable();

    private currentMeetingService = inject(CurrentMeetingService)

    private liveTimingActiveSubject = new BehaviorSubject<boolean>(false);
    public liveTimingActive = this.liveTimingActiveSubject.asObservable();

    private srStateSubject = new BehaviorSubject<ConnectionState | string>(ConnectionState.DISCONNECTED);
    public srState = this.srStateSubject.asObservable();

    currentMeeting?: MeetingImpl;

    meetingSubscription: Subscription;

    constructor(
        private httpClient: HttpClient
    ) {
        this.meetingSubscription = this.currentMeetingService.currentMeeting.subscribe(meeting => {
            this.currentMeeting = meeting;
        })
    }

    ngOnDestroy() {
        this.meetingSubscription.unsubscribe();
    }

    saveConfig(config: ImportConfig) {
        this.configSubject.next(config);
    }

    setLiveTimingActive(active: boolean) {
        this.liveTimingActiveSubject.next(active);
    }

    log(msg: string) {
        console.log(msg);
    }

    post(url: string, data: any): Observable<any> {
        return this.httpClient.post(url, data, {responseType: "text"});
    }

    sendData(data: any): Observable<string> {
        if (this.liveTimingActiveSubject.value) {
            if (this.currentMeeting) {

                return this.post(this.configSubject.value.apiUrl + "import/v1/alge/meet/" + this.currentMeeting.meet_id, data);
            } else {
                console.log("no meeting selected for live timing");
                return throwError(() => new Error("live timing has no meeting."));
            }
        } else {
            console.log("blocked sending because of inactive live timing");
            return throwError(() => new Error("live timing is not active."));
        }
    }

    private playImportSound(kind: 'start' | 'lane' | 'stop') {
        if (typeof window === 'undefined') {
            return;
        }

        const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
            return;
        }

        if (!this.audioContext) {
            this.audioContext = new AudioContextCtor();
        }

        const context = this.audioContext;
        if (context.state === 'suspended') {
            context.resume().catch(() => undefined);
        }

        const frequencies: Record<'start' | 'lane' | 'stop', number> = {
            start: 880,
            lane: 660,
            stop: 520
        };

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;

        oscillator.type = 'sine';
        oscillator.frequency.value = frequencies[kind];
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.16);
        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
        };
    }


    startHeat(event: number, heat: number) {
        this.log(`start heat: E: ${event} H: ${heat}`);
        this.playImportSound('start');

        let json = {
            'password': this.configSubject.value.password,
            'action': 'START',
            'event': event,
            'heat': heat
        }

        this.sendData(json).subscribe({
            next: value => {
                console.log("response: " + value);
                this.srStateSubject.next(value);
            },
            error: error => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[ImportService] START failed for event=${event}, heat=${heat}. Parsed frames were present but import start request failed.`, error);
                this.log(`START failed: E=${event} H=${heat} reason=${errorMessage}`);
                this.srStateSubject.next(ConnectionState.DISCONNECTED);
            }
        })
    }

    laneTime(lane: number, time: number, meter: number, done: boolean) {
        let doneString = done ? "yes" : "";
        this.log(`lane time (${lane}): ${time} ${meter}m ${doneString}`)
        this.playImportSound('lane');

        let json = {
            'password': this.configSubject.value.password,
            'action': 'time',
            'lane': lane,
            'time': time,
            'meter': meter,
            'finished': doneString
        }

        this.sendData(json).subscribe(this.handleResponse)
    }

    stopHeat(event: number, heat: number) {
        this.log(`stop heat: E: ${event} H: ${heat}`)
        this.playImportSound('stop');

        let json = {
            'password': this.configSubject.value.password,
            'action': 'STOP'
        }

        this.sendData(json).subscribe(this.handleResponse)
    }

    sendPing() {
        let json = {
            'action': 'PING',
        }

        this.sendData(json).subscribe(this.handleResponse)
    }

    handleResponse: PartialObserver<string> = {
        next: value => {
            console.log("response: " + value);
            this.srStateSubject.next(value);
        },
        error: _ => {
            this.srStateSubject.next(ConnectionState.DISCONNECTED);
        }
    }
}
