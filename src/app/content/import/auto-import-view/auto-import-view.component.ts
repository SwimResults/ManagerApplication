import { Component } from '@angular/core';
import {AutoImportToolComponent} from "../auto-import-tool/auto-import-tool.component";
import {GroupBoxComponent} from '../../../layout/group-box/group-box.component';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-auto-import-view',
    imports: [
        AutoImportToolComponent,
        GroupBoxComponent,
        MatIcon
    ],
  templateUrl: './auto-import-view.component.html',
  styleUrl: './auto-import-view.component.scss'
})
export class AutoImportViewComponent {
    autoImporters: number[] = [1];

    addAutoImporter() {
        this.autoImporters.push(this.autoImporters.length + 1);
    }

    removeAutoImporter(importer: number) {
        this.autoImporters = this.autoImporters.filter(i => i !== importer);
    }
}
