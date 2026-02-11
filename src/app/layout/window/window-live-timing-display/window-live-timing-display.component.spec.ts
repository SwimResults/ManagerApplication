import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WindowLiveTimingDisplayComponent } from './window-live-timing-display.component';

describe('WindowLiveTimingDisplayComponent', () => {
  let component: WindowLiveTimingDisplayComponent;
  let fixture: ComponentFixture<WindowLiveTimingDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WindowLiveTimingDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WindowLiveTimingDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
