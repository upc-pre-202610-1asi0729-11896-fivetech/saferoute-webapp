import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Route, RouteWaypoint } from '../domain/model/route-entity';
import { RouteResource, StopResource } from './route-response';
import { RouteAssembler } from './route-assembler';
import { environment } from '../../../environments/environment';

/**
 * HTTP access for routes (Spring Boot backend).
 *
 * <p>The route resource is flat; a route's stops live behind the dedicated
 * {@code /routes/{id}/stops} endpoints. This endpoint composes both so the application layer keeps
 * working with a single {@link Route} entity that carries its {@code waypoints}:</p>
 * <ul>
 *   <li>{@code getAll} loads routes, then fetches each route's stops to populate its waypoints;</li>
 *   <li>{@code create}/{@code update} save the route, then replace its stops in bulk.</li>
 * </ul>
 */
export class RouteApiEndpoint {
  private readonly url = `${environment.platformProviderJavaApiBaseUrl}/routes`;
  private readonly driversUrl = `${environment.platformProviderApiBaseUrl}/drivers`;
  private readonly assembler = new RouteAssembler();

  constructor(private http: HttpClient) {}

  private handleError(op: string) {
    return (e: HttpErrorResponse) => {
      console.error(`${op} failed:`, e.message);
      return throwError(() => new Error(e.message));
    };
  }

  /** Maps backend stop resources to the front-end waypoint shape. */
  private toWaypoints(stops: StopResource[]): RouteWaypoint[] {
    return (stops ?? []).map(s => ({
      order: s.stopOrder, name: s.name, lat: s.latitude, lng: s.longitude, studentId: null
    }));
  }

  /** Maps front-end waypoints to the backend add-stop payload. */
  private toStopBodies(waypoints: RouteWaypoint[]): unknown[] {
    return (waypoints ?? []).map(w => ({
      name: w.name, latitude: w.lat, longitude: w.lng, stopOrder: w.order
    }));
  }

  getStops(routeId: number): Observable<RouteWaypoint[]> {
    return this.http.get<StopResource[]>(`${this.url}/${routeId}/stops`).pipe(
      map(stops => this.toWaypoints(stops)),
      catchError(() => of([]))
    );
  }

  replaceStops(routeId: number, waypoints: RouteWaypoint[]): Observable<RouteWaypoint[]> {
    return this.http.put<StopResource[]>(`${this.url}/${routeId}/stops`, this.toStopBodies(waypoints)).pipe(
      map(stops => this.toWaypoints(stops)),
      catchError(() => of(waypoints ?? []))
    );
  }

  getAll(organizationId?: number): Observable<Route[]> {
    const routesUrl = organizationId ? `${this.url}?organizationId=${organizationId}` : this.url;
    return forkJoin({
      routeArr: this.http.get<RouteResource[]>(routesUrl),
      drivers: this.http.get<any[]>(this.driversUrl).pipe(catchError(() => of([] as any[])))
    }).pipe(
      switchMap(({ routeArr, drivers }) => {
        const driverName = new Map<number, string>(
          (drivers ?? []).map(driver => [Number(driver.id), driver.fullName ?? ''])
        );
        const routes = this.assembler.toEntitiesFromResponse(routeArr);
        if (routes.length === 0) return of([] as Route[]);
        // Populate each route's waypoints (from its stops endpoint) and resolve its driver name.
        return forkJoin(routes.map(r =>
          this.getStops(r.id).pipe(map(wps => {
            r.waypoints = wps;
            if (r.driverId != null) r.driverName = driverName.get(r.driverId) ?? r.driverName ?? '';
            return r;
          }))
        ));
      }),
      catchError(this.handleError('getAll'))
    );
  }

  create(route: Route): Observable<Route> {
    return this.http.post<RouteResource>(this.url, this.assembler.toResourceFromEntity(route)).pipe(
      switchMap(r => {
        const created = this.assembler.toEntityFromResource(r);
        return this.replaceStops(created.id, route.waypoints ?? []).pipe(
          map(wps => { created.waypoints = wps; return created; })
        );
      }),
      catchError(this.handleError('create'))
    );
  }

  update(route: Route): Observable<Route> {
    return this.http.put<RouteResource>(`${this.url}/${route.id}`, this.assembler.toResourceFromEntity(route)).pipe(
      switchMap(r => {
        const updated = this.assembler.toEntityFromResource(r);
        return this.replaceStops(route.id, route.waypoints ?? []).pipe(
          map(wps => { updated.waypoints = wps; return updated; })
        );
      }),
      catchError(this.handleError('update'))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      catchError(this.handleError('delete'))
    );
  }
}
