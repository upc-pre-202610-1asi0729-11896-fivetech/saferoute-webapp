import { Injectable, signal } from '@angular/core';
import { HomeDashboardApi } from '../infrastructure/home-dashboard-api';

@Injectable({ providedIn: 'root' })
export class HomeDashboardStore {
  private readonly _routes = signal<any[]>([]);
  private readonly _trips = signal<any[]>([]);
  private readonly _users = signal<any[]>([]);
  private readonly _parents = signal<any[]>([]);
  private readonly _children = signal<any[]>([]);

  readonly routes = this._routes.asReadonly();
  readonly trips = this._trips.asReadonly();
  readonly users = this._users.asReadonly();
  readonly parents = this._parents.asReadonly();
  readonly children = this._children.asReadonly();

  constructor(private readonly api: HomeDashboardApi) {}

  load(organizationId?: number | string): void {
    this.api.load(organizationId).subscribe(snapshot => {
      this._routes.set(snapshot.routes);
      this._trips.set(snapshot.trips);
      this._users.set(snapshot.users);
      this._parents.set(snapshot.parents);
      this._children.set(snapshot.children);
    });
  }
}
