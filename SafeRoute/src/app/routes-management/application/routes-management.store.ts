import {computed, Injectable, Signal, signal} from '@angular/core';
import {Route} from '../domain/model/route-entity';
import {Stop} from '../domain/model/stop-entity';
import {RoutesManagementApi} from '../infrastructure/routes-management-api';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {retry} from 'rxjs';

/**
 * Holds routes management application state and coordinates route/stop application layer behavior.
 */
@Injectable({
  providedIn: 'root'
})
export class RoutesManagementStore {
  readonly routeCount = computed(() => this.routes().length);
  readonly stopCount = computed(() => this.stops().length);

  private readonly routesSignal = signal<Route[]>([]);
  readonly routes = this.routesSignal.asReadonly();

  private readonly stopsSignal = signal<Stop[]>([]);
  readonly stops = this.stopsSignal.asReadonly();

  private readonly loadingSignal = signal<boolean>(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  constructor(private api: RoutesManagementApi) {
    this.loadRoutes();
    this.loadStops();
  }

  getRouteById(id: number): Signal<Route | undefined> {
    return computed(() => id ? this.routes().find(r => r.id === id) : undefined);
  }

  getStopById(id: number): Signal<Stop | undefined> {
    return computed(() => id ? this.stops().find(s => s.id === id) : undefined);
  }

  addRoute(route: Route): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.createRoute(route).pipe(retry(2)).subscribe({
      next: createdRoute => {
        this.routesSignal.update(routes => [...routes, createdRoute]);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to create route'));
        this.loadingSignal.set(false);
      }
    });
  }

  updateRoute(updatedRoute: Route): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.updateRoute(updatedRoute).pipe(retry(2)).subscribe({
      next: route => {
        this.routesSignal.update(routes => routes.map(r => r.id === route.id ? route : r));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to update route'));
        this.loadingSignal.set(false);
      }
    });
  }

  deleteRoute(id: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.deleteRoute(id).pipe(retry(2)).subscribe({
      next: () => {
        this.routesSignal.update(routes => routes.filter(r => r.id !== id));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to delete route'));
        this.loadingSignal.set(false);
      }
    });
  }

  addStop(stop: Stop): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.createStop(stop).pipe(retry(2)).subscribe({
      next: createdStop => {
        createdStop = this.assignRouteToStop(createdStop);
        this.stopsSignal.update(stops => [...stops, createdStop]);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to create stop'));
        this.loadingSignal.set(false);
      }
    });
  }

  updateStop(updatedStop: Stop): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.updateStop(updatedStop).pipe(retry(2)).subscribe({
      next: stop => {
        stop = this.assignRouteToStop(stop);
        this.stopsSignal.update(stops => stops.map(s => s.id === stop.id ? stop : s));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to update stop'));
        this.loadingSignal.set(false);
      }
    });
  }

  deleteStop(id: number): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.deleteStop(id).pipe(retry(2)).subscribe({
      next: () => {
        this.stopsSignal.update(stops => stops.filter(s => s.id !== id));
        this.loadingSignal.set(false);
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to delete stop'));
        this.loadingSignal.set(false);
      }
    });
  }

  private loadRoutes(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getRoutes().pipe(takeUntilDestroyed()).subscribe({
      next: routes => {
        this.routesSignal.set(routes);
        this.loadingSignal.set(false);
        this.errorSignal.set(null);
        this.assignRoutesToStops();
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to load routes'));
        this.loadingSignal.set(false);
      }
    });
  }

  private loadStops(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getStops().pipe(takeUntilDestroyed()).subscribe({
      next: stops => {
        this.stopsSignal.set(stops);
        this.loadingSignal.set(false);
        this.errorSignal.set(null);
        this.assignRoutesToStops();
      },
      error: err => {
        this.errorSignal.set(this.formatError(err, 'Failed to load stops'));
        this.loadingSignal.set(false);
      }
    });
  }

  private assignRoutesToStops(): void {
    this.stopsSignal.update(stops => stops.map(stop => this.assignRouteToStop(stop)));
  }

  private assignRouteToStop(stop: Stop): Stop {
    const routeId = stop.routeId ?? 0;
    stop.route = routeId ? this.getRouteById(routeId)() ?? null : null;
    return stop;
  }

  private formatError(error: any, fallback: string): string {
    if (error instanceof Error) {
      return error.message.includes('Resource not found') ? `${fallback}: Not found` : error.message;
    }
    return fallback;
  }
}
