import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveTimingOldViewComponent } from './live-timing-old-view.component';

describe('LiveTimingOldViewComponent', () => {
  let component: LiveTimingOldViewComponent;
  let fixture: ComponentFixture<LiveTimingOldViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTimingOldViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveTimingOldViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
