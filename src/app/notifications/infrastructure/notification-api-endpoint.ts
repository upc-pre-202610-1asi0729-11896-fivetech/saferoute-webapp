import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertRequest } from '../domain/model/notification-entity';
import { NotificationResource } from './notification-response';

export class NotificationApiEndpoint {
  private readonly url = `${environment.platformProviderApiBaseUrl}${environment.platformProviderNotificationsEndpointPath}`;

  constructor(private readonly http: HttpClient) {}

  getAll(recipientId?: number | string): Observable<NotificationResource[]> {
    const url = recipientId ? `${this.url}?recipientId=${recipientId}` : this.url;
    return this.http.get<NotificationResource[]>(url);
  }

  markAsDelivered(id: number | string): Observable<{ notification: NotificationResource }> {
    return this.http.post<{ notification: NotificationResource }>(`${this.url}/${id}/delivery`, {});
  }

  createAlert(alert: AlertRequest): Observable<unknown> {
    return this.http.post(`${this.url}/alerts`, {
      organizationId: alert.organizationId.toString(),
      tripId: alert.tripId?.toString() ?? null,
      message: alert.message,
      priority: alert.priority,
      recipientEmail: alert.recipientEmail || null,
    });
  }
}
