import { computed, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TripEntity } from '../domain/model/trip-entity';
import { RouteEntity } from '../domain/model/route-entity';
import { TripApi } from '../infrastructure/trip-api';
import { AttendanceResource } from '../infrastructure/trip-response';

// Re-export the domain models so existing consumers that import them from the store keep working.
export type { TripEntity } from '../domain/model/trip-entity';
export type { RouteEntity, RouteWaypoint } from '../domain/model/route-entity';

/**
 * Application store for the Trip Execution & Monitoring context.
 *
 * <p>Talks to the Spring Boot backend through the {@link TripApi} facade, which speaks the backend's
 * clean DDD contract (start / complete / boarding / incidents). This store keeps a stable public API
 * for the views and adapts their flat calls to the backend use cases:</p>
 * <ul>
 *   <li>{@code createTrip} &rarr; START a trip (POST /trips);</li>
 *   <li>{@code updateTrip}/{@code patchTrip} with status COMPLETED/CANCELLED &rarr; transition the trip;</li>
 *   <li>other patches (currentStop, currentLocation, studentsBoarded) &rarr; local UI state only
 *       (the backend Trip does not model live tracking);</li>
 *   <li>{@code deleteTrip} &rarr; DELETE /trips/{id}.</li>
 * </ul>
 * Trips returned by the backend are lean; the store enriches them with display data (routeName,
 * scheduledStartTime, studentIds, vehicle...) by joining with the loaded routes.
 */
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
  readonly activeTrips = computed(() => this._trips().filter(t => t.status === 'EN_ROUTE'));
  readonly tripCount = computed(() => this._trips().length);

  constructor(private readonly api: TripApi) {}

  /** Enriches a lean backend trip with display data joined from the loaded routes. */
  private enrich(t: TripEntity): TripEntity {
    const route = this._routes().find(r => r.id === t.routeId);
    if (!route) return t;
    return {
      ...t,
      routeName: route.name,
      driverName: route.driverName ?? '',
      vehicleId: route.vehicleId,
      vehiclePlate: route.vehiclePlate ?? '',
      studentIds: route.studentIds ?? [],
      tripType: route.type,
      scheduledStartTime: route.scheduledStartTime,
      studentsTotal: route.studentIds?.length ?? 0,
      studentsBoarded: t.studentsBoarded ?? 0
    };
  }

  loadAll(organizationId: number): void {
    this._currentOrgId = organizationId;
    this._loading.set(true);
    forkJoin({
      trips:  this.api.getTrips(organizationId).pipe(catchError(() => of([] as TripEntity[]))),
      routes: this.api.getRoutes(organizationId).pipe(catchError(() => of([] as RouteEntity[])))
    }).subscribe({
      next: r => {
        this._routes.set(r.routes ?? []);
        this._trips.set((r.trips ?? []).map(t => this.enrich(t)));
        this._loading.set(false);
      },
      error: err => { this._error.set(err?.message ?? 'Failed to load trips'); this._loading.set(false); }
    });
  }

  /** Re-run loadAll with the last used organizationId. */
  reload(): void {
    if (this._currentOrgId) this.loadAll(this._currentOrgId);
  }

  loadTrips(organizationId?: number): void {
    this._loading.set(true);
    this.api.getTrips(organizationId ?? this._currentOrgId ?? undefined).subscribe({
      next: t => { this._trips.set((t ?? []).map(x => this.enrich(x))); this._loading.set(false); },
      error: err => { this._error.set(err?.message ?? 'Failed'); this._loading.set(false); }
    });
  }

  getRouteById(id: number): RouteEntity | undefined {
    return this._routes().find(r => r.id === id);
  }

  getTripById(id: number): TripEntity | undefined {
    return this._trips().find(t => t.id === id);
  }

  /** Flat "create" maps to STARTING a trip (the backend has no SCHEDULED state). */
  createTrip(trip: Omit<TripEntity, 'id'>): void {
    const organizationId = trip.organizationId ?? this._currentOrgId ?? 1;
    const routeId = Number(trip.routeId);
    const driverId = Number(trip.driverId);
    if (!routeId || routeId < 1 || !driverId || driverId < 1) {
      this._error.set('A trip needs a valid route and driver to start');
      return;
    }
    this.api.startTrip({ organizationId, routeId, driverId }).subscribe({
      next: created => this._trips.update(ts => [...ts, this.enrich(created)]),
      error: err => this._error.set(err?.message ?? 'Failed to start trip')
    });
  }

  /** Convenience: start a trip directly from a route. */
  createTripFromRoute(route: RouteEntity): void {
    this.createTrip({
      routeId: route.id,
      driverId: route.driverId ?? 0,
      status: 'EN_ROUTE',
      organizationId: route.organizationId ?? this._currentOrgId ?? 1
    });
  }

  startDemoTripFromRoute(
    route: RouteEntity,
    onCreated?: (trip: TripEntity) => void,
    onFinished?: () => void
  ): void {
    const organizationId = route.organizationId ?? this._currentOrgId ?? 1;
    if (!route.id || !route.driverId) {
      this._error.set('La ruta necesita conductor asignado para reiniciar el demo.');
      onFinished?.();
      return;
    }
    this.api.startTrip({ organizationId, routeId: route.id, driverId: route.driverId }).subscribe({
      next: created => {
        const trip = this.enrich(created);
        this._trips.update(ts => [trip, ...ts]);
        onCreated?.(trip);
        onFinished?.();
      },
      error: err => {
        this._error.set(err?.message ?? 'No se pudo reiniciar el viaje demo');
        onFinished?.();
      }
    });
  }

  /** Flat "update": status COMPLETED completes the trip on the backend; otherwise local UI update. */
  updateTrip(trip: TripEntity): void {
    if (trip.status === 'COMPLETED') {
      this.completeTrip(trip.id);
      return;
    }
    if (trip.status === 'CANCELLED') {
      this.cancelTrip(trip.id);
      return;
    }
    this._trips.update(ts => ts.map(t => t.id === trip.id ? this.enrich({ ...t, ...trip }) : t));
  }

  /** Flat "patch": status COMPLETED/CANCELLED transitions the trip; other fields are local UI state only. */
  patchTrip(id: number, patch: Partial<TripEntity>): void {
    if (patch.status === 'COMPLETED') {
      this.completeTrip(id);
      return;
    }
    if (patch.status === 'CANCELLED') {
      this.cancelTrip(id);
      return;
    }
    this._trips.update(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  }

  completeTrip(id: number): void {
    this.api.completeTrip(id).subscribe({
      next: updated => this._trips.update(ts => ts.map(t => t.id === id ? this.enrich({
        ...t,
        ...updated,
        status: 'COMPLETED',
        currentStop: updated.currentStop ?? t.currentStop,
        currentLocation: updated.currentLocation ?? t.currentLocation,
        endTime: updated.endTime ?? t.endTime ?? new Date().toISOString()
      }) : t)),
      error: err => this._error.set(err?.message ?? 'Failed to complete trip')
    });
  }

  cancelTrip(id: number): void {
    this.api.cancelTrip(id).subscribe({
      next: updated => this._trips.update(ts => ts.map(t => t.id === id ? this.enrich({ ...t, ...updated }) : t)),
      error: err => this._error.set(err?.message ?? 'Failed to cancel trip')
    });
  }

  activateTrip(id: number): void {
    this.api.activateTrip(id).subscribe({
      next: updated => this._trips.update(ts => ts.map(t => t.id === id ? this.enrich({ ...t, ...updated }) : t)),
      error: err => this._error.set(err?.message ?? 'Failed to activate trip')
    });
  }

  completeTripAtDestination(trip: TripEntity): void {
    const studentIds = trip.studentIds ?? [];
    const dropOffs = studentIds.length
      ? forkJoin(studentIds.map(childId =>
          this.api.updateBoarding(trip.id, { childId, boardingState: 'DROPPED_OFF' })
            .pipe(catchError(() => of(null)))))
      : of([]);
    dropOffs.subscribe({
      next: () => this.completeTrip(trip.id),
      error: err => this._error.set(err?.message ?? 'Failed to complete trip')
    });
  }

  /** Marks a child's boarding status on the backend (US-11). */
  updateBoarding(tripId: number, childId: number, boardingState: string): void {
    this.api.updateBoarding(tripId, { childId, boardingState }).subscribe({
      next: updated => this._trips.update(ts => ts.map(t => {
        if (t.id !== tripId) return t;
        const boardedDelta = boardingState === 'BOARDED' ? 1 : 0;
        const nextBoarded = Math.min(t.studentsTotal ?? t.studentsBoarded ?? 0, (t.studentsBoarded ?? 0) + boardedDelta);
        return this.enrich({ ...t, ...updated, studentsBoarded: nextBoarded });
      })),
      error: err => this._error.set(err?.message ?? 'Failed to update boarding')
    });
  }

  /** Reports an incident on the backend. */
  reportIncident(tripId: number, description: string): void {
    this.api.reportIncident(tripId, { description }).subscribe({
      error: err => this._error.set(err?.message ?? 'Failed to report incident')
    });
  }

  getAttendances(tripId: number): Observable<AttendanceResource[]> {
    return this.api.getAttendances(tripId);
  }

  deleteTrip(id: number): void {
    this.api.deleteTrip(id).subscribe({
      next: () => this._trips.update(ts => ts.filter(t => t.id !== id)),
      error: err => this._error.set(err?.message ?? 'Failed to delete trip')
    });
  }

  /** Keep the route cache in sync when admin adds/edits a route. */
  syncRoute(route: RouteEntity): void {
    this._routes.update(rs => {
      const exists = rs.some(r => r.id === route.id);
      return exists ? rs.map(r => r.id === route.id ? { ...r, ...route } : r) : [...rs, route];
    });
  }
}
