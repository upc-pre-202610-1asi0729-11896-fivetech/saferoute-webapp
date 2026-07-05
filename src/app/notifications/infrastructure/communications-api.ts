import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { AlertRequest } from '../domain/model/notification-entity';
import { IncidentApiEndpoint } from './incident-api-endpoint';
import { IncidentResource } from './incident-response';
import { NotificationApiEndpoint } from './notification-api-endpoint';
import { NotificationResource } from './notification-response';

@Injectable({ providedIn: 'root' })
export class CommunicationsApi extends BaseApi {
  private readonly incidentsEndpoint: IncidentApiEndpoint;
  private readonly notificationsEndpoint: NotificationApiEndpoint;

  constructor(http: HttpClient) {
    super();
    this.incidentsEndpoint = new IncidentApiEndpoint(http);
    this.notificationsEndpoint = new NotificationApiEndpoint(http);
  }

  getIncidents(tripId: number | string): Observable<IncidentResource[]> {
    return this.incidentsEndpoint.getByTrip(tripId);
  }

  getNotifications(recipientId?: number | string): Observable<NotificationResource[]> {
    return this.notificationsEndpoint.getAll(recipientId);
  }

  reportIncident(tripId: number | string, description: string): Observable<unknown> {
    return this.incidentsEndpoint.report(tripId, description);
  }

  markAsDelivered(id: number | string): Observable<{ notification: NotificationResource }> {
    return this.notificationsEndpoint.markAsDelivered(id);
  }

  createAlert(alert: AlertRequest): Observable<unknown> {
    return this.notificationsEndpoint.createAlert(alert);
  }
}
