import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusBarElementComponent } from './status-bar-element.component';

describe('StatusBarElementComponent', () => {
  let component: StatusBarElementComponent;
  let fixture: ComponentFixture<StatusBarElementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBarElementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusBarElementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
