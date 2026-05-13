import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

export interface IncidentEntity {
  id: number;
  type: string;
  severity: string;
  message: string;
  date: string;
  tripId?: number;
}

export interface NotificationEntity {
  id: number;
  title: string;
  body: string;
  date: string;
  read: boolean;
  userId?: number;
}

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

  private readonly incidentsUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderIncidentsEndpointPath}`;
  private readonly notificationsUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderNotificationsEndpointPath}`;

  constructor(private http: HttpClient) {
    this.loadIncidents();
    this.loadNotifications();
  }

  loadIncidents(): void {
    this._loading.set(true);
    this.http.get<IncidentEntity[]>(this.incidentsUrl)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: data => {
          this._incidents.set(Array.isArray(data) ? data : []);
          this._loading.set(false);
        },
        error: err => {
          this._error.set(err.message ?? 'Failed to load incidents');
          this._loading.set(false);
        }
      });
  }

  loadNotifications(): void {
    this.http.get<NotificationEntity[]>(this.notificationsUrl)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: data => this._notifications.set(Array.isArray(data) ? data : []),
        error: () => { /* silently ignore if endpoint unavailable */ }
      });
  }

  reportIncident(incident: Omit<IncidentEntity, 'id'>): void {
    this._loading.set(true);
    this.http.post<IncidentEntity>(this.incidentsUrl, incident).subscribe({
      next: created => {
        this._incidents.update(list => [created, ...list]);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(err.message ?? 'Failed to report incident');
        this._loading.set(false);
      }
    });
  }

  markAsRead(id: number): void {
    this._notifications.update(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  }
}
