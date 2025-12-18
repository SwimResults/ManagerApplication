import { TestBed } from '@angular/core/testing';

import { CurrentMeetingService } from './current-meeting.service';

describe('CurrentMeetingService', () => {
  let service: CurrentMeetingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentMeetingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
