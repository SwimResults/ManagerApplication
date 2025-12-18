import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventListEventRowComponent } from './event-list-event-row.component';

describe('EventListEventRowComponent', () => {
  let component: EventListEventRowComponent;
  let fixture: ComponentFixture<EventListEventRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventListEventRowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventListEventRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
