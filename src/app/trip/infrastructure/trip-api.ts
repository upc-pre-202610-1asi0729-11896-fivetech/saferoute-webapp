import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TripEntity } from '../domain/model/trip-entity';
import { RouteEntity } from '../domain/model/route-entity';
import { AttendanceResource, IncidentResource, StartTripRequest, UpdateBoardingRequest, ReportIncidentRequest } from './trip-response';
import { TripApiEndpoint } from './trip-api-endpoint';

/**
 * Infrastructure facade for the Trip context (Java backend).
 *
 * <p>Use-case oriented gateway consumed by the application store, mirroring the Fleet structure
 * (store &rarr; api facade &rarr; endpoint). Exposes the backend's DDD operations.</p>
 */
@Injectable({ providedIn: 'root' })
export class TripApi {
  constructor(private readonly endpoint: TripApiEndpoint) {}

  getTrips(organizationId?: number): Observable<TripEntity[]> { return this.endpoint.getTrips(organizationId); }
  getTripById(id: number): Observable<TripEntity> { return this.endpoint.getTripById(id); }
  getRoutes(organizationId?: number): Observable<RouteEntity[]> { return this.endpoint.getRoutes(organizationId); }

  startTrip(req: StartTripRequest): Observable<TripEntity> { return this.endpoint.startTrip(req); }
  completeTrip(id: number): Observable<TripEntity> { return this.endpoint.completeTrip(id); }
  updateBoarding(tripId: number, req: UpdateBoardingRequest): Observable<TripEntity> { return this.endpoint.updateBoarding(tripId, req); }
  reportIncident(tripId: number, req: ReportIncidentRequest): Observable<TripEntity> { return this.endpoint.reportIncident(tripId, req); }
  deleteTrip(id: number): Observable<void> { return this.endpoint.deleteTrip(id); }

  getAttendances(tripId: number): Observable<AttendanceResource[]> { return this.endpoint.getAttendances(tripId); }
  getIncidents(tripId: number): Observable<IncidentResource[]> { return this.endpoint.getIncidents(tripId); }
}
