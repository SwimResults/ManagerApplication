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


    startHeat(event: number, heat: number) {
        this.log(`start heat: E: ${event} H: ${heat}`);

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
            }
        })
    }

    laneTime(lane: number, time: number, meter: number, done: boolean) {
        let doneString = done ? "yes" : "";
        this.log(`lane time (${lane}): ${time} ${meter}m ${doneString}`)

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
