import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { IncidentEntity } from '../domain/model/incident-entity';
import { AlertRequest, NotificationEntity } from '../domain/model/notification-entity';
import { IncidentResource } from '../infrastructure/incident-response';
import { NotificationResource } from '../infrastructure/notification-response';
import { CommunicationsApi } from '../infrastructure/communications-api';
import { IncidentAssembler } from '../infrastructure/incident-assembler';
import { NotificationAssembler } from '../infrastructure/notification-assembler';

export type { IncidentEntity } from '../domain/model/incident-entity';
export type { AlertRequest, NotificationEntity } from '../domain/model/notification-entity';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly _incidents = signal<IncidentEntity[]>([]);
  private readonly _notifications = signal<NotificationEntity[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly incidents = this._incidents.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  private readonly incidentAssembler = new IncidentAssembler();
  private readonly notificationAssembler = new NotificationAssembler();

  constructor(private readonly api: CommunicationsApi) {
    this.loadNotifications();
  }

  loadIncidents(_tripId?: number | string): void {
    if (!_tripId) {
      this._incidents.set([]);
      return;
    }
    this._loading.set(true);
    this.api.getIncidents(_tripId).subscribe({
      next: data => {
        this._incidents.set((data ?? []).map(item => this.incidentAssembler.toEntityFromResource(item)));
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  loadNotifications(recipientId?: number | string): void {
    this.api.getNotifications(recipientId).subscribe({
      next: data => this._notifications.set((data ?? []).map(item => this.notificationAssembler.toEntityFromResource(item))),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  reportIncident(incident: Omit<IncidentEntity, 'id'>): void {
    if (!incident.tripId) {
      this._error.set('El backend real requiere tripId para reportar una incidencia.');
      return;
    }
    this._loading.set(true);
    this.api.reportIncident(incident.tripId, incident.description ?? incident.message).subscribe({
      next: () => {
        this.loadIncidents(incident.tripId);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  markAsRead(id: number | string): void {
    this.api.markAsDelivered(id).subscribe({
      next: response => {
        const updated = response.notification ? this.notificationAssembler.toEntityFromResource(response.notification) : null;
        this._notifications.update(list => list.map(item => item.id === id && updated ? updated : item));
      },
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  markAllAsRead(): void {
    this._notifications().filter(item => !item.read).forEach(item => this.markAsRead(item.id));
  }

  createAlert(alert: AlertRequest, onSuccess?: () => void): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.createAlert(alert).subscribe({
      next: () => {
        this.loadNotifications();
        this._loading.set(false);
        onSuccess?.();
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  clearError(): void {
    this._error.set(null);
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con el backend de SafeRoute.';
    if (error.status === 401) return 'Sesion expirada o token invalido.';
    if (error.status === 403) return 'No tienes permisos para notificaciones.';
    return error.message || 'Error al consumir Notifications del backend.';
  }
}
