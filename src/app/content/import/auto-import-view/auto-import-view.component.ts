import { Component } from '@angular/core';
import {AutoImportToolComponent} from "../auto-import-tool/auto-import-tool.component";

@Component({
  selector: 'app-auto-import-view',
    imports: [
        AutoImportToolComponent
    ],
  templateUrl: './auto-import-view.component.html',
  styleUrl: './auto-import-view.component.scss'
})
export class AutoImportViewComponent {

}
