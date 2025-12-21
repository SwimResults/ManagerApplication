import {ConnectionState, State} from '../model/state.model';
import {Competitor, CurrentHeatModel} from '../model/current-heat.model';

export function getClassForState(state: State): string {
    switch (state) {
        case State.NOT_RUNNING:
            return "error"
        case State.READY:
            return "warn"
        case State.RUNNING:
            return "success"
        default:
            return "info";
    }
}

export function getClassForConnectionState(state: ConnectionState | string): string {
    switch (state) {
        case ConnectionState.CONNECTED:
            return "success"
        case "OK":
            return "success"
        case ConnectionState.DISCONNECTED:
            return "error"
        default:
            return "info";
    }
}

export function getAvailableMeters(heat: CurrentHeatModel): number[] {
    if (!heat.competitors || heat.competitors.size <= 0) return [];
    return Array.from(new Set(Array.from(heat.competitors.values()).map(c => {
        return Array.from(c.splits.keys());
    }).reduce((acc, curr) => {
        return acc.concat(curr);
    }))).sort((a, b) => a   - b);
}

export function getCompetitorsSorted(heat: CurrentHeatModel): Competitor[] {
    return Array.from(heat.competitors.values()).sort((a, b) => {
        return a.lane - b.lane;
    });
}
