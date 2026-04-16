import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoImportViewComponent } from './auto-import-view.component';

describe('AutoImportViewComponent', () => {
  let component: AutoImportViewComponent;
  let fixture: ComponentFixture<AutoImportViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoImportViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AutoImportViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
