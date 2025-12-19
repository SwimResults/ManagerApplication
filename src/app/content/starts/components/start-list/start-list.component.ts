import {Component, Input} from '@angular/core';
import {Start} from "../../../../core/model/start/start.model";
import {StartListTileConfig} from "../../../../core/model/start/start-list-tile-config.model";
import {FetchingModel} from "../../../../core/model/common/fetching.model";
import {StartListTileComponent} from '../start-list-tile/start-list-tile.component';
import {AthleteRelation} from "../../../../core/model/user/follower.model";
import {SpinnerComponent} from '../../../../layout/element/spinner/spinner.component';

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
