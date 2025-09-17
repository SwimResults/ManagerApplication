import {Component, Input} from '@angular/core';


@Component({
  selector: 'sr-group-box',
  imports: [],
  templateUrl: './group-box.component.html',
  styleUrl: './group-box.component.scss',
  standalone: true
})
export class GroupBoxComponent {
  @Input() boxTitle?: string;
}
