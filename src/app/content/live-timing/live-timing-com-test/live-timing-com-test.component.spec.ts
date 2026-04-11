import { ComponentFixture, TestBed } from '@angular/core/testing';
import {of} from 'rxjs';

import { LiveTimingComTestComponent } from './live-timing-com-test.component';
import {SerialComService} from '../../../core/service/serial-com.service';

describe('LiveTimingComTestComponent', () => {
  let component: LiveTimingComTestComponent;
  let fixture: ComponentFixture<LiveTimingComTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTimingComTestComponent],
      providers: [
        {
          provide: SerialComService,
          useValue: {
            status: of({isListening: false, portPath: null, error: null}),
            messages: of(),
            listPorts: async () => [],
            startListening: async () => ({success: true}),
            stopListening: async () => ({success: true})
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveTimingComTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
