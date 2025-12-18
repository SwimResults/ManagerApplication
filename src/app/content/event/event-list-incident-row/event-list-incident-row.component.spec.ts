import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventListIncidentRowComponent } from './event-list-incident-row.component';

describe('EventListIncidentRowComponent', () => {
  let component: EventListIncidentRowComponent;
  let fixture: ComponentFixture<EventListIncidentRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventListIncidentRowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventListIncidentRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
