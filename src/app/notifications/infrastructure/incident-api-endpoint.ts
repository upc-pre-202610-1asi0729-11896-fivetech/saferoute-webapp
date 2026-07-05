import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IncidentResource } from './incident-response';

export class IncidentApiEndpoint {
  private readonly tripsUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderTripsEndpointPath}`;

  constructor(private readonly http: HttpClient) {}

  getByTrip(tripId: number | string): Observable<IncidentResource[]> {
    return this.http.get<IncidentResource[]>(`${this.tripsUrl}/${tripId}/incidents`);
  }

  report(tripId: number | string, description: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.tripsUrl}/${tripId}/incidents`, { description });
  }
}
