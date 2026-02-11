import {Routes} from '@angular/router';
import {MainComponent} from './layout/main/main.component';
import {LiveTimingOldViewComponent} from './content/live-timing/live-timing-old-view/live-timing-old-view.component';
import {ImportViewComponent} from './content/import/import-view/import-view.component';
import {EventListViewComponent} from './content/event/event-list-view/event-list-view.component';
import {AuthComponent} from './content/auth/auth.component';
import {LogoutComponent} from './content/auth/logout/logout.component';
import {EventViewComponent} from './content/event/event-view/event-view.component';
import {WindowLiveTimingDisplayComponent} from './layout/window/window-live-timing-display/window-live-timing-display.component';

export let routes: Routes;
routes = [
    // Display route MUST be first to match before default route
    {
        path: "display",
        component: WindowLiveTimingDisplayComponent
    },
    {
        path: "old",
        component: LiveTimingOldViewComponent
    },
    {path: 'auth', component: AuthComponent},
    {path: 'auth/logout', component: LogoutComponent},
    {path: "import", component: ImportViewComponent},
    {path: "schedule", component: EventListViewComponent},
    { path: "event/:event_number",  component: EventViewComponent },
    {
        path: "",
        pathMatch: "full",
        component: MainComponent
    },
];
