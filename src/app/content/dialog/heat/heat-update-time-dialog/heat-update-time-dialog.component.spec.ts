import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeatUpdateTimeDialogComponent } from './heat-update-time-dialog.component';

describe('HeatUpdateTimeDialogComponent', () => {
  let component: HeatUpdateTimeDialogComponent;
  let fixture: ComponentFixture<HeatUpdateTimeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeatUpdateTimeDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeatUpdateTimeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
