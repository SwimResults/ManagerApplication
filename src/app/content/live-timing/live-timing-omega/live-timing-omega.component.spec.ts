import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveTimingOmegaComponent } from './live-timing-omega.component';

describe('LiveTimingOmegaComponent', () => {
  let component: LiveTimingOmegaComponent;
  let fixture: ComponentFixture<LiveTimingOmegaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveTimingOmegaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveTimingOmegaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
