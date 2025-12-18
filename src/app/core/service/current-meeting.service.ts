import {Injectable} from '@angular/core';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {MeetingImpl} from '../model/meeting/meeting.model';

@Injectable({
    providedIn: 'root'
})
export class CurrentMeetingService {
    private currentMeetingSubject = new BehaviorSubject<MeetingImpl>({} as MeetingImpl);
    public currentMeeting = this.currentMeetingSubject.asObservable().pipe(distinctUntilChanged());

    setCurrentMeeting(meeting: MeetingImpl) {
        console.log("set currentMeeting", meeting.meet_id);

        this.currentMeetingSubject.next(meeting);
        window.localStorage.setItem('currentMeeting', meeting.meet_id);
    }
}
