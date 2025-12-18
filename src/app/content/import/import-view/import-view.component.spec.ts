import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportViewComponent } from './import-view.component';

describe('ImportViewComponent', () => {
  let component: ImportViewComponent;
  let fixture: ComponentFixture<ImportViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
