import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventListViewComponent } from './event-list-view.component';

describe('EventListViewComponent', () => {
  let component: EventListViewComponent;
  let fixture: ComponentFixture<EventListViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventListViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
