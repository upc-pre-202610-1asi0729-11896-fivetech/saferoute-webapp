import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Route } from '../domain/model/route-entity';
import { RouteApiEndpoint } from './route-api-endpoint';

@Injectable({ providedIn: 'root' })
export class RoutesManagementApi {
  private readonly routes: RouteApiEndpoint;

  constructor(http: HttpClient) {
    this.routes = new RouteApiEndpoint(http);
  }

  getRoutes(organizationId?: number): Observable<Route[]> { return this.routes.getAll(organizationId); }
  createRoute(r: Route): Observable<Route> { return this.routes.create(r); }
  updateRoute(r: Route): Observable<Route> { return this.routes.update(r); }
  deleteRoute(id: number): Observable<void> { return this.routes.delete(id); }
}
