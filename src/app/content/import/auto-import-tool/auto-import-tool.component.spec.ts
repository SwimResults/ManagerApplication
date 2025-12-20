import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoImportToolComponent } from './auto-import-tool.component';

describe('AutoImportToolComponent', () => {
  let component: AutoImportToolComponent;
  let fixture: ComponentFixture<AutoImportToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoImportToolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AutoImportToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
