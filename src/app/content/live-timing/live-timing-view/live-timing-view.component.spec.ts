import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveTimingViewComponent } from './live-timing-view.component';

describe('LiveTimingViewComponent', () => {
  let component: LiveTimingViewComponent;
  let fixture: ComponentFixture<LiveTimingViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTimingViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveTimingViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
