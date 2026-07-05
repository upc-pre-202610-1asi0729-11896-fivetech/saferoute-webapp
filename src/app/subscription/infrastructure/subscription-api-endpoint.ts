import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubscriptionResource } from './subscription-response';

export class SubscriptionApiEndpoint {
  private readonly url = `${environment.platformProviderApiBaseUrl}/subscriptions`;

  constructor(private readonly http: HttpClient) {}

  getByOrganization(organizationId: number | string): Observable<SubscriptionResource[]> {
    return this.http.get<SubscriptionResource[]>(`${this.url}?organizationId=${organizationId}`);
  }

  create(organizationId: number | string, planId: number | string): Observable<SubscriptionResource> {
    return this.http.post<SubscriptionResource>(this.url, {
      organizationId: organizationId.toString(),
      planId: planId.toString(),
    });
  }

  changePlan(subscriptionId: number | string, planId: number | string): Observable<SubscriptionResource> {
    return this.http.put<SubscriptionResource>(`${this.url}/${subscriptionId}/plan`, {
      planId: planId.toString(),
    });
  }

  cancel(subscriptionId: number | string): Observable<SubscriptionResource> {
    return this.http.delete<SubscriptionResource>(`${this.url}/${subscriptionId}`);
  }

  activate(subscriptionId: number | string): Observable<SubscriptionResource> {
    return this.http.post<SubscriptionResource>(`${this.url}/${subscriptionId}/activation`, {});
  }
}
