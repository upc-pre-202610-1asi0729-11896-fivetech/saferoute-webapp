import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanResource } from './plan-response';

export class PlanApiEndpoint {
  private readonly url = `${environment.platformProviderApiBaseUrl}/plans`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<PlanResource[]> {
    return this.http.get<PlanResource[]>(this.url);
  }
}
