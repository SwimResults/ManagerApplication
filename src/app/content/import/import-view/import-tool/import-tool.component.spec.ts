import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ImportToolComponent} from './import-tool.component';
import {provideHttpClientTesting} from "@angular/common/http/testing";
import {MatRadioModule} from "@angular/material/radio";
import {MatIconModule} from "@angular/material/icon";
import {ReactiveFormsModule} from "@angular/forms";
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';

describe('ImportToolComponent', () => {
  let component: ImportToolComponent;
  let fixture: ComponentFixture<ImportToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
        imports: [
        MatRadioModule,
        MatIconModule,
        ReactiveFormsModule, ImportToolComponent],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(ImportToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
