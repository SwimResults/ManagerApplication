import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportLogComponent } from './import-log.component';

describe('ImportLogComponent', () => {
  let component: ImportLogComponent;
  let fixture: ComponentFixture<ImportLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportLogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
