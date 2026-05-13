import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserEntity } from '../domain/model/student-entity';
import { VehicleEntity } from '../domain/model/vehicle-entity';

export interface ParentEntity {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: boolean;
  organizationId: number;
}

export interface ChildEntity {
  id: number;
  name: string;
  grade: string;
  parentId: number;
  status: boolean;
  boardingStatus: 'ABORDADO' | 'EN_ESPERA' | 'AUSENTE';
  organizationId: number;
}

@Injectable({ providedIn: 'root' })
export class StakeholderStore {
  private readonly base = environment.platformProviderApiBaseUrl;

  private readonly _students = signal<UserEntity[]>([]);
  private readonly _vehicles = signal<VehicleEntity[]>([]);
  private readonly _parents  = signal<ParentEntity[]>([]);
  private readonly _children = signal<ChildEntity[]>([]);
  private readonly _loading  = signal(false);
  private readonly _error    = signal<string | null>(null);

  readonly students = this._students.asReadonly();
  readonly vehicles = this._vehicles.asReadonly();
  readonly parents  = this._parents.asReadonly();
  readonly children = this._children.asReadonly();
  readonly loading  = this._loading.asReadonly();
  readonly error    = this._error.asReadonly();

  constructor(private http: HttpClient) {}

  loadAll(organizationId: number): void {
    this._loading.set(true);
    const q = `?organizationId=${organizationId}`;
    forkJoin({
      users:    this.http.get<UserEntity[]>   (`${this.base}/users${q}`).pipe(catchError(() => of([]))),
      vehicles: this.http.get<VehicleEntity[]>(`${this.base}/vehicles${q}`).pipe(catchError(() => of([]))),
      parents:  this.http.get<ParentEntity[]> (`${this.base}/parents${q}`).pipe(catchError(() => of([]))),
      children: this.http.get<ChildEntity[]>  (`${this.base}/children${q}`).pipe(catchError(() => of([])))
    }).subscribe({
      next: d => {
        this._students.set(d.users ?? []);
        this._vehicles.set(d.vehicles ?? []);
        this._parents.set(d.parents ?? []);
        this._children.set(d.children ?? []);
        this._loading.set(false);
      },
      error: err => { this._error.set(err.message ?? 'Failed to load'); this._loading.set(false); }
    });
  }

  // ── Users ──
  createProfile(profile: Omit<UserEntity, 'id'>): void {
    this.http.post<UserEntity>(`${this.base}/users`, profile).subscribe({
      next: c => this._students.update(l => [...l, c]),
      error: err => this._error.set(err.message)
    });
  }

  updateProfile(profile: UserEntity): void {
    this.http.put<UserEntity>(`${this.base}/users/${profile.id}`, profile).subscribe({
      next: u => this._students.update(l => l.map(x => x.id === u.id ? u : x)),
      error: err => this._error.set(err.message)
    });
  }

  deleteUser(id: number): void {
    this.http.delete(`${this.base}/users/${id}`).subscribe({
      next: () => this._students.update(l => l.filter(u => u.id !== id)),
      error: err => this._error.set(err.message)
    });
  }

  // ── Parents ──
  createParent(parent: Omit<ParentEntity, 'id'>): void {
    this.http.post<ParentEntity>(`${this.base}/parents`, parent).subscribe({
      next: c => this._parents.update(l => [...l, c]),
      error: err => this._error.set(err.message)
    });
  }

  updateParent(parent: ParentEntity): void {
    this.http.put<ParentEntity>(`${this.base}/parents/${parent.id}`, parent).subscribe({
      next: u => this._parents.update(l => l.map(x => x.id === u.id ? u : x)),
      error: err => this._error.set(err.message)
    });
  }

  deleteParent(id: number): void {
    this.http.delete(`${this.base}/parents/${id}`).subscribe({
      next: () => {
        this._parents.update(l => l.filter(p => p.id !== id));
        this._children.update(l => l.filter(c => c.parentId !== id));
      },
      error: err => this._error.set(err.message)
    });
  }

  // ── Children ──
  createChild(child: Omit<ChildEntity, 'id'>): void {
    this.http.post<ChildEntity>(`${this.base}/children`, child).subscribe({
      next: c => this._children.update(l => [...l, c]),
      error: err => this._error.set(err.message)
    });
  }

  updateChild(child: ChildEntity): void {
    this.http.put<ChildEntity>(`${this.base}/children/${child.id}`, child).subscribe({
      next: u => this._children.update(l => l.map(x => x.id === u.id ? u : x)),
      error: err => this._error.set(err.message)
    });
  }

  deleteChild(id: number): void {
    this.http.delete(`${this.base}/children/${id}`).subscribe({
      next: () => this._children.update(l => l.filter(c => c.id !== id)),
      error: err => this._error.set(err.message)
    });
  }

  // ── Vehicles ──
  createVehicle(vehicle: Omit<VehicleEntity, 'id'>): void {
    this.http.post<VehicleEntity>(`${this.base}/vehicles`, vehicle).subscribe({
      next: v => this._vehicles.update(l => [...l, v]),
      error: err => this._error.set(err.message)
    });
  }

  updateVehicle(vehicle: VehicleEntity): void {
    this.http.put<VehicleEntity>(`${this.base}/vehicles/${vehicle.id}`, vehicle).subscribe({
      next: v => this._vehicles.update(l => l.map(x => x.id === v.id ? v : x)),
      error: err => this._error.set(err.message)
    });
  }

  deleteVehicle(id: number): void {
    this.http.delete(`${this.base}/vehicles/${id}`).subscribe({
      next: () => this._vehicles.update(l => l.filter(v => v.id !== id)),
      error: err => this._error.set(err.message)
    });
  }

  // ── Drivers (users with role DRIVER) ──
  createDriver(driver: Omit<UserEntity, 'id'> & { password?: string }): void {
    this.http.post<UserEntity>(`${this.base}/users`, { ...driver, role: 'DRIVER' }).subscribe({
      next: u => this._students.update(l => [...l, u]),
      error: err => this._error.set(err.message)
    });
  }

  updateDriver(driver: UserEntity): void {
    this.http.put<UserEntity>(`${this.base}/users/${driver.id}`, driver).subscribe({
      next: u => this._students.update(l => l.map(x => x.id === u.id ? u : x)),
      error: err => this._error.set(err.message)
    });
  }

  deleteDriver(id: number): void {
    this.http.delete(`${this.base}/users/${id}`).subscribe({
      next: () => this._students.update(l => l.filter(u => u.id !== id)),
      error: err => this._error.set(err.message)
    });
  }
}
