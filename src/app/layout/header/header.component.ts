import {Component} from '@angular/core';
import {IconButtonComponent} from '../element/icon-button/icon-button.component';

@Component({
    selector: 'app-header',
    imports: [
        IconButtonComponent
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {

}
