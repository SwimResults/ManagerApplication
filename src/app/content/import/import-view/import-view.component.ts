import { Component } from '@angular/core';
import {ImportToolComponent} from './import-tool/import-tool.component';

@Component({
  selector: 'app-import-view',
    imports: [
        ImportToolComponent
    ],
  templateUrl: './import-view.component.html',
  styleUrl: './import-view.component.scss'
})
export class ImportViewComponent {

}
