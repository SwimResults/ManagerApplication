import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentEditDialogComponent } from './incident-edit-dialog.component';

describe('IncidentEditDialogComponent', () => {
  let component: IncidentEditDialogComponent;
  let fixture: ComponentFixture<IncidentEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentEditDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
