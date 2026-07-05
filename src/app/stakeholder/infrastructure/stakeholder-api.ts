import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseApi } from '../../shared/infrastructure/base-api';
import { VehicleEntity } from '../domain/model/vehicle-entity';
import { ChildEntity, ParentEntity, UserEntity } from '../domain/model/student-entity';
import { DriverResource, ParentResource } from './student-response';
import { StudentApiEndpoint } from './student-api-endpoint';
import { VehicleApiEndpoint } from './vehicle-api-endpoint';

export interface StakeholderSnapshot {
  drivers: DriverResource[];
  vehicles: VehicleEntity[];
  parents: ParentResource[];
}

@Injectable({ providedIn: 'root' })
export class StakeholderApi extends BaseApi {
  private readonly studentsEndpoint: StudentApiEndpoint;
  private readonly vehiclesEndpoint: VehicleApiEndpoint;

  constructor(http: HttpClient) {
    super();
    this.studentsEndpoint = new StudentApiEndpoint(http);
    this.vehiclesEndpoint = new VehicleApiEndpoint(http);
  }

  loadAll(organizationId: number | string): Observable<StakeholderSnapshot> {
    return forkJoin({
      drivers: this.studentsEndpoint.getDrivers().pipe(
        map(items => (items ?? []).filter(item => item.organizationId?.toString() === organizationId.toString())),
        catchError(() => of([] as DriverResource[])),
      ),
      vehicles: this.vehiclesEndpoint.getByOrganization(organizationId).pipe(catchError(() => of([]))),
      parents: this.studentsEndpoint.getParents().pipe(
        map(items => (items ?? []).filter(item => item.organizationId?.toString() === organizationId.toString())),
        catchError(() => of([] as ParentResource[])),
      ),
    });
  }

  createParent(parent: Omit<ParentEntity, 'id'> & { password?: string }): Observable<ParentResource> {
    return this.studentsEndpoint.createParent(parent);
  }

  updateParentPassword(parent: ParentEntity & { password: string }): Observable<unknown> {
    return this.studentsEndpoint.updateParentPassword(parent);
  }

  deleteParent(id: number | string): Observable<unknown> {
    return this.studentsEndpoint.deleteParent(id);
  }

  createChild(child: Omit<ChildEntity, 'id'>): Observable<ParentResource> {
    return this.studentsEndpoint.createChild(child);
  }

  deleteChild(parentId: number | string, childId: number | string): Observable<unknown> {
    return this.studentsEndpoint.deleteChild(parentId, childId);
  }

  createVehicle(vehicle: Omit<VehicleEntity, 'id'>): Observable<VehicleEntity> {
    return this.vehiclesEndpoint.create(vehicle);
  }

  updateVehicle(vehicle: VehicleEntity): Observable<VehicleEntity> {
    return this.vehiclesEndpoint.update(vehicle);
  }

  deleteVehicle(id: number | string): Observable<unknown> {
    return this.vehiclesEndpoint.delete(id);
  }

  createDriver(driver: Omit<UserEntity, 'id'> & { password?: string }): Observable<DriverResource> {
    return this.studentsEndpoint.createDriver(driver);
  }

  deleteDriver(id: number | string): Observable<unknown> {
    return this.studentsEndpoint.deleteDriver(id);
  }
}
