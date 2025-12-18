import {inject, Injectable} from '@angular/core';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {MeetingImpl} from '../model/meeting/meeting.model';
import {Router} from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class CurrentMeetingService {
    private currentMeetingSubject = new BehaviorSubject<MeetingImpl>({} as MeetingImpl);
    public currentMeeting = this.currentMeetingSubject.asObservable().pipe(distinctUntilChanged());

    private router = inject(Router)

    setCurrentMeeting(meeting: MeetingImpl) {
        console.log("set currentMeeting", meeting.meet_id);

        this.currentMeetingSubject.next(meeting);
        window.localStorage.setItem('currentMeeting', meeting.meet_id);

        const body = document.getElementsByTagName("body").item(0);

        if (meeting.layout && meeting.layout.color_set && meeting.layout.color_set.primary && meeting.layout.color_set.secondary) {
            body?.style.setProperty("--bg-gradient-1", meeting.layout.color_set.primary);
            body?.style.setProperty("--bg-gradient-2", meeting.layout.color_set.secondary);
        } else {
            body?.style.setProperty("--bg-gradient-1", "#a3ffff");
            body?.style.setProperty("--bg-gradient-2", "#ffa3ed");
        }

        this.router.navigateByUrl('/')
    }
}
