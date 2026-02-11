import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveTimingDisplayComponent } from './live-timing-display.component';

describe('LiveTimingDisplayComponent', () => {
  let component: LiveTimingDisplayComponent;
  let fixture: ComponentFixture<LiveTimingDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTimingDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveTimingDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
