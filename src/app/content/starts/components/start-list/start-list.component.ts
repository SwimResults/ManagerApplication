import {Component, Input} from '@angular/core';
import {StartListTileComponent} from '../start-list-tile/start-list-tile.component';
import {SpinnerComponent} from '../../../../layout/element/spinner/spinner.component';
import {Start, StartListTileConfig, FetchingModel, AthleteRelation} from '@swimresults/angular';

@Component({
    selector: 'sr-start-list',
    templateUrl: './start-list.component.html',
    styleUrls: ['./start-list.component.scss'],
    imports: [SpinnerComponent, StartListTileComponent, SpinnerComponent]
})
export class StartListComponent {
    @Input() starts!: Start[] | undefined;
    @Input() config!: StartListTileConfig;
    @Input() athletes: AthleteRelation[] = [];

    @Input() fetching: FetchingModel = {fetching: false};
}
