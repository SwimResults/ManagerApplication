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

    // Bright color palette that fits Material Design
    private readonly colorPalette = [
        '#F3E5F5', // Light Purple
        '#E3F2FD', // Light Blue
        '#FFF9C4', // Light Yellow
        '#E8F5E9', // Light Green
        '#FFF3E0', // Light Orange
        '#FCE4EC', // Light Pink
        '#E0F2F1', // Light Teal
        '#FFEBEE', // Light Red
        '#E1F5FE', // Very Light Blue
        '#F1F8E9', // Very Light Green
    ];

    addAutoImporter() {
        this.autoImporters.push(this.autoImporters.length + 1);
    }

    removeAutoImporter(importer: number) {
        this.autoImporters = this.autoImporters.filter(i => i !== importer);
    }

    getImporterColor(importerId: number): string {
        return this.colorPalette[(importerId - 1) % this.colorPalette.length];
    }

    private simpleHash(num: number): number {
        // Use a simple but effective hash function for consistent results
        let hash = num;
        hash = ((hash << 5) - hash) + num;
        hash = hash & hash; // Convert to 32-bit integer
        return Math.abs(hash);
    }
}
