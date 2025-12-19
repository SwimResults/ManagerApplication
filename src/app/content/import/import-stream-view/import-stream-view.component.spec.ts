import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportStreamViewComponent } from './import-stream-view.component';

describe('ImportStreamViewComponent', () => {
  let component: ImportStreamViewComponent;
  let fixture: ComponentFixture<ImportStreamViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportStreamViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportStreamViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
