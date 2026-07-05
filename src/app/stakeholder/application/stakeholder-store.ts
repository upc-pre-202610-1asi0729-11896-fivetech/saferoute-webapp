import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ChildEntity, ParentEntity, UserEntity } from '../domain/model/student-entity';
import { VehicleEntity } from '../domain/model/vehicle-entity';
import { StakeholderApi } from '../infrastructure/stakeholder-api';
import { ChildResource, DriverResource, ParentResource } from '../infrastructure/student-response';
import { StudentAssembler } from '../infrastructure/student-assembler';

export type { ChildEntity, ParentEntity } from '../domain/model/student-entity';

@Injectable({ providedIn: 'root' })
export class StakeholderStore {
  private readonly _students = signal<UserEntity[]>([]);
  private readonly _vehicles = signal<VehicleEntity[]>([]);
  private readonly _parents = signal<ParentEntity[]>([]);
  private readonly _children = signal<ChildEntity[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly students = this._students.asReadonly();
  readonly vehicles = this._vehicles.asReadonly();
  readonly parents = this._parents.asReadonly();
  readonly children = this._children.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  private readonly assembler = new StudentAssembler();

  constructor(private readonly api: StakeholderApi) {}

  loadAll(organizationId: number | string): void {
    this._loading.set(true);
    this.api.loadAll(organizationId).subscribe({
      next: data => {
        this._students.set(data.drivers.map(driver => this.assembler.toDriverEntity(driver)));
        this._vehicles.set(data.vehicles ?? []);
        this._parents.set(data.parents.map(parent => this.assembler.toParentEntity(parent)));
        this._children.set(data.parents.flatMap(parent => (parent.children ?? []).map(child => this.assembler.toChildEntity(child, parent))));
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  createProfile(profile: Omit<UserEntity, 'id'>): void {
    this.createDriver({ ...profile, password: undefined });
  }

  updateProfile(profile: UserEntity): void {
    this._students.update(list => list.map(item => item.id.toString() === profile.id.toString() ? { ...item, ...profile } : item));
  }

  deleteUser(_id: number | string): void {
    this._error.set('El backend real no expone eliminacion de usuarios/stakeholders.');
  }

  createParent(parent: Omit<ParentEntity, 'id'> & { password?: string }): void {
    this.api.createParent(parent).subscribe({
      next: created => this._parents.update(list => [...list, this.assembler.toParentEntity(created)]),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  updateParent(parent: ParentEntity & { password?: string }): void {
    this._parents.update(list => list.map(item =>
      item.id.toString() === parent.id.toString()
        ? { ...item, name: parent.name, email: parent.email, phone: parent.phone, status: parent.status, organizationId: parent.organizationId }
        : item
    ));
    if (!parent.password) {
      return;
    }
    this.api.updateParentPassword({ ...parent, password: parent.password }).subscribe({
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  deleteParent(_id: number | string): void {
    this.api.deleteParent(_id).subscribe({
      next: () => {
        this._parents.update(list => list.filter(parent => parent.id.toString() !== _id.toString()));
        this._children.update(list => list.filter(child => child.parentId.toString() !== _id.toString()));
      },
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  createChild(child: Omit<ChildEntity, 'id'>): void {
    this.api.createChild(child).subscribe({
      next: parent => {
        const parentEntity = this.assembler.toParentEntity(parent);
        const returnedChildren = (parent.children ?? []).map(item => this.assembler.toChildEntity(item, parent));
        this._parents.update(list => list.map(item =>
          item.id.toString() === parent.id
            ? { ...item, ...parentEntity, status: item.status }
            : item
        ));
        this._children.update(list => {
          const byKey = new Map<string, ChildEntity>();
          [...list, ...returnedChildren].forEach(item => {
            byKey.set(`${item.parentId}:${item.id}:${item.name}:${item.grade}`, item);
          });
          return Array.from(byKey.values());
        });
      },
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  updateChild(child: ChildEntity): void {
    this._children.update(list => list.map(item =>
      item.id.toString() === child.id.toString() && item.parentId.toString() === child.parentId.toString()
        ? { ...item, ...child }
        : item.id.toString() === child.id.toString()
          ? { ...item, ...child }
          : item
    ));
  }

  deleteChild(_id: number | string): void {
    const child = this._children().find(item => item.id.toString() === _id.toString());
    if (!child) return;
    this.api.deleteChild(child.parentId, _id).subscribe({
      next: () => this._children.update(list => list.filter(item => item.id.toString() !== _id.toString())),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  createVehicle(vehicle: Omit<VehicleEntity, 'id'>): void {
    this.api.createVehicle(vehicle).subscribe({
      next: v => this._vehicles.update(list => [...list, v]),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  updateVehicle(vehicle: VehicleEntity): void {
    this.api.updateVehicle(vehicle).subscribe({
      next: v => this._vehicles.update(list => list.map(item => item.id === v.id ? v : item)),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  deleteVehicle(id: number | string): void {
    this.api.deleteVehicle(id).subscribe({
      next: () => this._vehicles.update(list => list.filter(vehicle => vehicle.id !== id)),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  createDriver(driver: Omit<UserEntity, 'id'> & { password?: string }): void {
    this.api.createDriver(driver).subscribe({
      next: created => this._students.update(list => [...list, { ...this.assembler.toDriverEntity(created), email: driver.email }]),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  updateDriver(driver: UserEntity): void {
    this._students.update(list => list.map(item => item.id.toString() === driver.id.toString() ? { ...item, ...driver } : item));
  }

  deleteDriver(_id: number | string): void {
    this.api.deleteDriver(_id).subscribe({
      next: () => this._students.update(list => list.filter(driver => driver.id.toString() !== _id.toString())),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con el backend de SafeRoute.';
    if (error.status === 401) return 'Sesion expirada o token invalido.';
    if (error.status === 403) return 'No tienes permisos para Stakeholder.';
    return error.message || 'Error al consumir Stakeholder del backend.';
  }
}
