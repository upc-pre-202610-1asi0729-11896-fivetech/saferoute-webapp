import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { PlanApiEndpoint } from './plan-api-endpoint';
import { PlanResource } from './plan-response';
import { SubscriptionApiEndpoint } from './subscription-api-endpoint';
import { SubscriptionResource } from './subscription-response';

@Injectable({ providedIn: 'root' })
export class SubscriptionManagementApi extends BaseApi {
  private readonly plansEndpoint: PlanApiEndpoint;
  private readonly subscriptionsEndpoint: SubscriptionApiEndpoint;

  constructor(http: HttpClient) {
    super();
    this.plansEndpoint = new PlanApiEndpoint(http);
    this.subscriptionsEndpoint = new SubscriptionApiEndpoint(http);
  }

  getPlans(): Observable<PlanResource[]> {
    return this.plansEndpoint.getAll();
  }

  getSubscriptionsByOrganization(organizationId: number | string): Observable<SubscriptionResource[]> {
    return this.subscriptionsEndpoint.getByOrganization(organizationId);
  }

  createSubscription(organizationId: number | string, planId: number | string): Observable<SubscriptionResource> {
    return this.subscriptionsEndpoint.create(organizationId, planId);
  }

  changePlan(subscriptionId: number | string, planId: number | string): Observable<SubscriptionResource> {
    return this.subscriptionsEndpoint.changePlan(subscriptionId, planId);
  }

  cancelSubscription(subscriptionId: number | string): Observable<SubscriptionResource> {
    return this.subscriptionsEndpoint.cancel(subscriptionId);
  }

  activateSubscription(subscriptionId: number | string): Observable<SubscriptionResource> {
    return this.subscriptionsEndpoint.activate(subscriptionId);
  }
}
