import {Injectable} from '@angular/core';
import {BaseApi} from '../../shared/infrastructure/base-api';
import {Route} from '../domain/model/route-entity';
import {Stop} from '../domain/model/stop-entity';
import {HttpClient} from '@angular/common/http';
import {RouteApiEndpoint} from './route-api-endpoint';
import {StopApiEndpoint} from './stop-api-endpoint';
import {Observable} from 'rxjs';

/**
 * Infrastructure facade for routes and stops endpoint operations.
 */
@Injectable({providedIn: 'root'})
export class RoutesManagementApi extends BaseApi {
  private readonly routesEndpoint: RouteApiEndpoint;
  private readonly stopsEndpoint: StopApiEndpoint;

  constructor(http: HttpClient) {
    super();
    this.routesEndpoint = new RouteApiEndpoint(http);
    this.stopsEndpoint = new StopApiEndpoint(http);
  }

  getRoutes(): Observable<Route[]> {
    return this.routesEndpoint.getAll();
  }

  getRoute(id: number): Observable<Route> {
    return this.routesEndpoint.getById(id);
  }

  createRoute(route: Route): Observable<Route> {
    return this.routesEndpoint.create(route);
  }

  updateRoute(route: Route): Observable<Route> {
    return this.routesEndpoint.update(route, route.id);
  }

  deleteRoute(id: number): Observable<void> {
    return this.routesEndpoint.delete(id);
  }

  getStops(): Observable<Stop[]> {
    return this.stopsEndpoint.getAll();
  }

  getStop(id: number): Observable<Stop> {
    return this.stopsEndpoint.getById(id);
  }

  createStop(stop: Stop): Observable<Stop> {
    return this.stopsEndpoint.create(stop);
  }

  updateStop(stop: Stop): Observable<Stop> {
    return this.stopsEndpoint.update(stop, stop.id);
  }

  deleteStop(id: number): Observable<void> {
    return this.stopsEndpoint.delete(id);
  }
}
