import { computed, Injectable, signal } from '@angular/core';
import { Route } from '../domain/model/route-entity';
import { RoutesManagementApi } from '../infrastructure/routes-management-api';

@Injectable({ providedIn: 'root' })
export class RoutesManagementStore {
  private readonly routesSignal = signal<Route[]>([]);
  readonly routes = this.routesSignal.asReadonly();
  readonly routeCount = computed(() => this.routes().length);

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  private _currentOrgId: number | null = null;

  constructor(private api: RoutesManagementApi) {}

  loadRoutes(organizationId?: number): void {
    if (organizationId) this._currentOrgId = organizationId;
    this.loadingSignal.set(true);
    this.api.getRoutes(this._currentOrgId ?? undefined).subscribe({
      next: routes => { this.routesSignal.set(routes); this.loadingSignal.set(false); },
      error: err => { this.errorSignal.set(err.message); this.loadingSignal.set(false); }
    });
  }

  getRouteById(id: number): Route | undefined {
    return this.routes().find(r => r.id === id);
  }

  addRoute(route: Route): void {
    this.loadingSignal.set(true);
    this.api.createRoute(route).subscribe({
      next: created => { this.routesSignal.update(rs => [...rs, created]); this.loadingSignal.set(false); },
      error: err => { this.errorSignal.set(err.message); this.loadingSignal.set(false); }
    });
  }

  updateRoute(route: Route): void {
    this.loadingSignal.set(true);
    this.api.updateRoute(route).subscribe({
      next: updated => { this.routesSignal.update(rs => rs.map(r => r.id === updated.id ? updated : r)); this.loadingSignal.set(false); },
      error: err => { this.errorSignal.set(err.message); this.loadingSignal.set(false); }
    });
  }

  deleteRoute(id: number): void {
    this.loadingSignal.set(true);
    this.api.deleteRoute(id).subscribe({
      next: () => { this.routesSignal.update(rs => rs.filter(r => r.id !== id)); this.loadingSignal.set(false); },
      error: err => { this.errorSignal.set(err.message); this.loadingSignal.set(false); }
    });
  }

}
