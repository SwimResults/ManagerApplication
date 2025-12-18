import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { meetingSelectedGuard } from './meeting-selected.guard';

describe('meetingSelectedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => meetingSelectedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
