import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TripEntity } from '../domain/model/trip-entity';
import { RouteEntity } from '../domain/model/route-entity';
import {
  TripResource, RouteResource, StopResource, AttendanceResource, IncidentResource,
  StartTripRequest, UpdateBoardingRequest, ReportIncidentRequest
} from './trip-response';
import { TripAssembler } from './trip-assembler';

/**
 * HTTP access for the Trip context against the Spring Boot (Java) backend.
 *
 * <p>Speaks the backend's clean DDD contract: trips are started / completed / have boarding and
 * incidents through dedicated use-case endpoints (not generic CRUD). Routes (read-only here) are
 * loaded with their stops so the trip map has waypoints.</p>
 */
@Injectable({ providedIn: 'root' })
export class TripApiEndpoint {
  private readonly tripsUrl = `${environment.platformProviderJavaApiBaseUrl}/trips`;
  private readonly routesUrl = `${environment.platformProviderJavaApiBaseUrl}/routes`;

  constructor(private http: HttpClient) {}

  getTrips(organizationId?: number): Observable<TripEntity[]> {
    const url = organizationId ? `${this.tripsUrl}?organizationId=${organizationId}` : this.tripsUrl;
    return this.http.get<TripResource[]>(url).pipe(
      map(r => TripAssembler.toTripEntities(r)),
      catchError(() => of([]))
    );
  }

  getTripById(id: number): Observable<TripEntity> {
    return this.http.get<TripResource>(`${this.tripsUrl}/${id}`).pipe(map(r => TripAssembler.toTripEntity(r)));
  }

  /** Loads routes with their stops (waypoints), so trip views/map have route geometry. */
  getRoutes(organizationId?: number): Observable<RouteEntity[]> {
    const url = organizationId ? `${this.routesUrl}?organizationId=${organizationId}` : this.routesUrl;
    return this.http.get<RouteResource[]>(url).pipe(
      switchMap(arr => {
        const resources = arr ?? [];
        if (resources.length === 0) return of([] as RouteEntity[]);
        return forkJoin(resources.map(r =>
          this.http.get<StopResource[]>(`${this.routesUrl}/${r.id}/stops`).pipe(
            map(stops => TripAssembler.toRouteEntity(r, TripAssembler.toWaypoints(stops))),
            catchError(() => of(TripAssembler.toRouteEntity(r, [])))
          )
        ));
      }),
      catchError(() => of([]))
    );
  }

  startTrip(req: StartTripRequest): Observable<TripEntity> {
    return this.http.post<TripResource>(this.tripsUrl, req).pipe(map(r => TripAssembler.toTripEntity(r)));
  }

  completeTrip(id: number): Observable<TripEntity> {
    return this.http.post<TripResource>(`${this.tripsUrl}/${id}/completion`, {}).pipe(
      map(r => TripAssembler.toTripEntity(r))
    );
  }

  cancelTrip(id: number): Observable<TripEntity> {
    return this.http.post<TripResource>(`${this.tripsUrl}/${id}/cancellation`, {}).pipe(
      map(r => TripAssembler.toTripEntity(r))
    );
  }

  activateTrip(id: number): Observable<TripEntity> {
    return this.http.post<TripResource>(`${this.tripsUrl}/${id}/activation`, {}).pipe(
      map(r => TripAssembler.toTripEntity(r))
    );
  }

  updateBoarding(tripId: number, req: UpdateBoardingRequest): Observable<TripEntity> {
    return this.http.patch<TripResource>(`${this.tripsUrl}/${tripId}/attendances`, req).pipe(
      map(r => TripAssembler.toTripEntity(r))
    );
  }

  getAttendances(tripId: number): Observable<AttendanceResource[]> {
    return this.http.get<AttendanceResource[]>(`${this.tripsUrl}/${tripId}/attendances`).pipe(catchError(() => of([])));
  }

  reportIncident(tripId: number, req: ReportIncidentRequest): Observable<TripEntity> {
    return this.http.post<TripResource>(`${this.tripsUrl}/${tripId}/incidents`, req).pipe(
      map(r => TripAssembler.toTripEntity(r))
    );
  }

  getIncidents(tripId: number): Observable<IncidentResource[]> {
    return this.http.get<IncidentResource[]>(`${this.tripsUrl}/${tripId}/incidents`).pipe(catchError(() => of([])));
  }

  deleteTrip(id: number): Observable<void> {
    return this.http.delete<void>(`${this.tripsUrl}/${id}`);
  }
}
