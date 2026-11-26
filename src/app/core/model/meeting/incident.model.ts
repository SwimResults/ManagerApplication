import type * as ApiMeeting from '@swimresults/api/meeting';
import {createDateForBerlin} from "../../function/date.functions";

// added_at/updated_at are set by meeting-service; IncidentImpl is sent as the request body without them
export type Incident = Omit<ApiMeeting.Incident, 'type' | 'added_at' | 'updated_at'> & {
  type: "EVENT" | "DURATION" | "TIMELESS";
  added_at?: string;
  updated_at?: string;
};

export class IncidentImpl {
    _id: string;
    meeting: string;
    type: "EVENT" | "DURATION" | "TIMELESS";
    name: string;
    name_extension: string;
    start: string;
    end: string;
    prev_event: number;
    next_event: number;

    constructor(data: Incident) {
        this._id = data._id;
        this.meeting = data.meeting ?? '';
        this.type = data.type;
        this.name = data.name ?? '';
        this.name_extension = data.name_extension ?? '';
        this.start = data.start;
        this.end = data.end;
        this.prev_event = data.prev_event ?? 0;
        this.next_event = data.next_event ?? 0;
    }

    public getStartDate(): Date {
        return createDateForBerlin(this.start);
    }

    public getEndDate(): Date {
        return createDateForBerlin(this.end)
    }

    public getStartTimeString(): string {
        const d = this.getStartDate();
        const h = d.getHours();
        const m = "0" + d.getMinutes();
        return h + ":" + m.substr(-2);
    }

    public getDurationString(): string {
        const s = this.getStartDate();
        const e = this.getEndDate();
        const millis = e.getTime() - s.getTime();
        return millis / 60000 + "min";
    }
}
