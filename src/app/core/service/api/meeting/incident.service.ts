import {inject, Injectable} from '@angular/core';
import {BaseService} from '../base.service';
import {ApiService} from '../api.service';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {Incident} from '../../../model/meeting/incident.model';

@Injectable({
  providedIn: 'root'
})
export class IncidentService extends BaseService {
    private apiService = inject(ApiService);

    constructor() {
        super("IncidentService", environment.api_urls.meeting_service);
    }

    public updateIncident(incident: Incident): Observable<Incident> {
        return this.apiService.put(this.API_URL, "incident", incident);
    }

    public addIncident(incident: Incident): Observable<Incident> {
        return this.apiService.post(this.API_URL, "incident", incident);
    }
}
