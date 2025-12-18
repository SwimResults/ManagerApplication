import { CanActivateFn } from '@angular/router';
import {inject} from '@angular/core';
import {CurrentMeetingService} from '../service/current-meeting.service';
import {map} from 'rxjs';

export const meetingSelectedGuard: CanActivateFn = (route, state) => {
    const currentMeetingService = inject(CurrentMeetingService);

    return currentMeetingService.currentMeeting.pipe(map(meeting => meeting.meet_id !== undefined));
};
