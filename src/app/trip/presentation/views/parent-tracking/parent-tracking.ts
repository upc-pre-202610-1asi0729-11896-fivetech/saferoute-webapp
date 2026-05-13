import { Component, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { TripStore, TripEntity } from '../../../application/trip-store';
import { AuthStore } from '../../../../iam/application/auth-store';
import { TripMap } from '../../../../shared/presentation/components/trip-map/trip-map';
import { environment } from '../../../../../environments/environment';

interface TimelineItem { time: string; event: string; done: boolean; icon: string }

@Component({
  selector: 'app-parent-tracking',
  imports: [MatIconModule, MatProgressSpinnerModule, TripMap],
  templateUrl: './parent-tracking.html',
  styleUrl: './parent-tracking.css'
})
export class ParentTracking {
  protected store = inject(TripStore);
  protected auth = inject(AuthStore);
  private http = inject(HttpClient);

  parents = signal<any[]>([]);
  children = signal<any[]>([]);

  myParent = computed(() => {
    const email = this.auth.currentUser()?.email;
    return this.parents().find(p => p.email === email) ?? null;
  });

  myChildren = computed(() => {
    const me = this.myParent();
    return me ? this.children().filter(c => c.parentId === me.id) : [];
  });

  myChildIds = computed(() => this.myChildren().map(c => c.id));

  trackedTrip = computed<TripEntity | null>(() => {
    const ids = this.myChildIds();
    if (!ids.length) return null;
    const trips = this.store.trips();
    return trips.find(t => t.status === 'EN_ROUTE' && (t.studentIds || []).some(id => ids.includes(id)))
        ?? trips.find(t => t.status === 'SCHEDULED' && (t.studentIds || []).some(id => ids.includes(id)))
        ?? trips.find(t => (t.studentIds || []).some(id => ids.includes(id)))
        ?? null;
  });

  trackedRoute = computed(() => {
    const t = this.trackedTrip();
    return t ? this.store.getRouteById(t.routeId) : undefined;
  });

  waypoints = computed(() => this.trackedRoute()?.waypoints ?? []);

  timeline = computed<TimelineItem[]>(() => {
    const t = this.trackedTrip();
    const wps = this.waypoints();
    if (!t || !wps.length) return [];
    const currentIdx = wps.findIndex(w => w.name === t.currentStop);
    const items: TimelineItem[] = [];
    if (t.scheduledStartTime) {
      items.push({ time: t.scheduledStartTime, event: 'Bus salió del punto inicial', done: !!t.startTime, icon: 'flag' });
    }
    wps.forEach((wp, i) => {
      items.push({
        time: '',
        event: `Parada ${i + 1} — ${wp.name}`,
        done: currentIdx >= 0 && i < currentIdx,
        icon: 'location_on'
      });
    });
    return items;
  });

  eta = computed(() => {
    const t = this.trackedTrip();
    if (!t) return '—';
    if (t.endTime) return new Date(t.endTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    if (t.scheduledStartTime) return t.scheduledStartTime;
    return '—';
  });

  constructor() {
    const base  = environment.platformProviderApiBaseUrl;
    const orgId = this.auth.currentUser()?.organizationId;
    const q     = orgId ? `?organizationId=${orgId}` : '';
    this.http.get<any[]>(`${base}/parents${q}`).pipe(catchError(() => of([]))).subscribe(p => this.parents.set(p ?? []));
    this.http.get<any[]>(`${base}/children${q}`).pipe(catchError(() => of([]))).subscribe(c => this.children.set(c ?? []));
  }
}
