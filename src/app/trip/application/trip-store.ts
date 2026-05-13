import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RouteWaypoint {
  order: number;
  name: string;
  lat: number;
  lng: number;
  studentId?: number | null;
}

export interface RouteEntity {
  id: number;
  name: string;
  type?: string;
  driverId: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  studentIds?: number[];
  scheduledStartTime?: string;
  status?: string;
  organizationId?: number;
  waypoints?: RouteWaypoint[];
}

export interface TripEntity {
  id: number;
  routeId: number;
  routeName?: string;
  driverId: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  studentIds?: number[];
  tripType?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  status: string;
  startTime?: string | null;
  endTime?: string | null;
  studentsTotal?: number;
  studentsBoarded?: number;
  currentStop?: string | null;
  currentLocation?: string | null;
  organizationId?: number;
}

@Injectable({ providedIn: 'root' })
export class TripStore {
  private readonly _trips = signal<TripEntity[]>([]);
  private readonly _routes = signal<RouteEntity[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private _currentOrgId: number | null = null;

  readonly trips = this._trips.asReadonly();
  readonly routes = this._routes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly activeTrips = computed(() => this._trips().filter((t) => t.status === 'EN_ROUTE'));
  readonly tripCount = computed(() => this._trips().length);

  private readonly base = environment.platformProviderApiBaseUrl;

  constructor(private http: HttpClient) {}

  loadAll(organizationId: number): void {
    this._currentOrgId = organizationId;
    this._loading.set(true);
    const q = `?organizationId=${organizationId}`;
    forkJoin({
      trips: this.http.get<TripEntity[]>(`${this.base}/trips${q}`).pipe(catchError(() => of([]))),
      routes: this.http
        .get<RouteEntity[]>(`${this.base}/routes${q}`)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (r) => {
        const routes = r.routes ?? [];
        const validRouteIds = new Set(routes.map((ro) => ro.id));
        const cleanTrips = (r.trips ?? []).filter((t) => validRouteIds.has(t.routeId));
        this._trips.set(cleanTrips);
        this._routes.set(routes);
        this._loading.set(false);
      },
      error: (err) => {
        this._error.set(err?.message ?? 'Failed to load trips');
        this._loading.set(false);
      },
    });
  }

  /** Re-run loadAll with the last used organizationId (e.g. for refresh buttons) */
  reload(): void {
    if (this._currentOrgId) this.loadAll(this._currentOrgId);
  }

  loadTrips(organizationId?: number): void {
    this._loading.set(true);
    const q = organizationId ? `?organizationId=${organizationId}` : '';
    this.http.get<TripEntity[]>(`${this.base}/trips${q}`).subscribe({
      next: (t) => {
        const validIds = new Set(this._routes().map((r) => r.id));
        const clean = (t ?? []).filter((tr) => !validIds.size || validIds.has(tr.routeId));
        this._trips.set(clean);
        this._loading.set(false);
      },
      error: (err) => {
        this._error.set(err?.message ?? 'Failed');
        this._loading.set(false);
      },
    });
  }

  getRouteById(id: number): RouteEntity | undefined {
    return this._routes().find((r) => r.id === id);
  }

  getTripById(id: number): TripEntity | undefined {
    return this._trips().find((t) => t.id === id);
  }

  createTrip(trip: Omit<TripEntity, 'id'>): void {
    this.http.post<TripEntity>(`${this.base}/trips`, trip).subscribe({
      next: (created) => this._trips.update((ts) => [...ts, created]),
      error: (err) => this._error.set(err?.message ?? 'Failed to create trip'),
    });
  }

  updateTrip(trip: TripEntity): void {
    this.http.put<TripEntity>(`${this.base}/trips/${trip.id}`, trip).subscribe({
      next: (u) => this._trips.update((ts) => ts.map((t) => (t.id === u.id ? u : t))),
      error: (err) => this._error.set(err?.message ?? 'Failed to update trip'),
    });
  }

  patchTrip(id: number, patch: Partial<TripEntity>): void {
    this.http.patch<TripEntity>(`${this.base}/trips/${id}`, patch).subscribe({
      next: (u) => this._trips.update((ts) => ts.map((t) => (t.id === id ? u : t))),
      error: (err) => this._error.set(err?.message ?? 'Failed to update trip'),
    });
  }

  deleteTrip(id: number): void {
    this.http.delete(`${this.base}/trips/${id}`).subscribe({
      next: () => this._trips.update((ts) => ts.filter((t) => t.id !== id)),
      error: (err) => this._error.set(err?.message ?? 'Failed to delete trip'),
    });
  }

  /** Keep TripStore's route cache in sync when admin adds/edits a route */
  syncRoute(route: RouteEntity): void {
    this._routes.update((rs) => {
      const exists = rs.some((r) => r.id === route.id);
      return exists ? rs.map((r) => (r.id === route.id ? { ...r, ...route } : r)) : [...rs, route];
    });
  }

  createTripFromRoute(route: RouteEntity): void {
    const today = new Date().toISOString().slice(0, 10);
    const trip: Omit<TripEntity, 'id'> = {
      routeId: route.id,
      routeName: route.name,
      driverId: route.driverId ?? 0,
      driverName: route.driverName ?? '',
      vehicleId: route.vehicleId,
      vehiclePlate: route.vehiclePlate ?? '',
      studentIds: route.studentIds ?? [],
      tripType: route.type ?? 'OUTBOUND',
      scheduledDate: today,
      scheduledStartTime: route.scheduledStartTime ?? '',
      status: 'SCHEDULED',
      startTime: null,
      endTime: null,
      studentsTotal: route.studentIds?.length ?? 0,
      studentsBoarded: 0,
      currentStop: null,
      currentLocation: null,
      organizationId: route.organizationId ?? 1,
    };
    this.createTrip(trip);
  }
}
