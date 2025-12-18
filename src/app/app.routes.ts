import {Routes} from '@angular/router';
import {MainComponent} from './layout/main/main.component';
import {LiveTimingOldViewComponent} from './content/live-timing/live-timing-old-view/live-timing-old-view.component';
import {ImportViewComponent} from './content/import/import-view/import-view.component';

export let routes: Routes;
routes = [
    {
        path: "old",
        component: LiveTimingOldViewComponent
    },
    {
        path: "",
        pathMatch: "full",
        component: MainComponent
    },
    {
        path: "import",
        component: ImportViewComponent
    }
];
