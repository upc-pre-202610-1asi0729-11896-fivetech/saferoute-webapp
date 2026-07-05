import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ChildEntity, ParentEntity, UserEntity } from '../domain/model/student-entity';
import { DriverResource, ParentResource } from './student-response';

export class StudentApiEndpoint {
  private readonly base = environment.platformProviderApiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getDrivers(): Observable<DriverResource[]> {
    return this.http.get<DriverResource[]>(`${this.base}/drivers`);
  }

  getParents(): Observable<ParentResource[]> {
    return this.http.get<ParentResource[]>(`${this.base}/parents`);
  }

  createParent(parent: Omit<ParentEntity, 'id'> & { password?: string }): Observable<ParentResource> {
    const createParentProfile = () => this.http.post<ParentResource>(`${this.base}/parents`, {
      organizationId: parent.organizationId.toString(),
      fullName: parent.name,
      email: parent.email,
      phoneNumber: parent.phone,
    });
    return parent.password
      ? this.http.post(`${this.base}${environment.platformProviderSignUpEndpointPath}`, {
          username: parent.email,
          password: parent.password,
          organizationId: parent.organizationId.toString(),
          roles: ['ROLE_PARENT'],
        }).pipe(switchMap(() => createParentProfile()))
      : createParentProfile();
  }

  updateParentPassword(parent: ParentEntity & { password: string }): Observable<unknown> {
    return this.http.patch(`${this.base}${environment.platformProviderUsersEndpointPath}/password`, {
      username: parent.email,
      password: parent.password,
    });
  }

  deleteParent(id: number | string): Observable<unknown> {
    return this.http.delete(`${this.base}/parents/${id}`);
  }

  createChild(child: Omit<ChildEntity, 'id'>): Observable<ParentResource> {
    return this.http.post<ParentResource>(`${this.base}/parents/${child.parentId}/children`, {
      fullName: child.name,
      school: child.grade,
    });
  }

  deleteChild(parentId: number | string, childId: number | string): Observable<unknown> {
    return this.http.delete(`${this.base}/parents/${parentId}/children/${childId}`);
  }

  createDriver(driver: Omit<UserEntity, 'id'> & { password?: string }): Observable<DriverResource> {
    const createDriverProfile = () => this.http.post<DriverResource>(`${this.base}/drivers`, {
      organizationId: driver.organizationId?.toString() ?? '1',
      fullName: `${driver.firstName} ${driver.lastName}`.trim(),
      licenseNumber: 'PENDING',
      phoneNumber: 'PENDING',
    });
    return driver.password && driver.email
      ? this.http.post(`${this.base}${environment.platformProviderSignUpEndpointPath}`, {
          username: driver.email,
          password: driver.password,
          organizationId: driver.organizationId?.toString() ?? '1',
          roles: ['ROLE_DRIVER'],
        }).pipe(switchMap(() => createDriverProfile()))
      : createDriverProfile();
  }

  deleteDriver(id: number | string): Observable<unknown> {
    return this.http.delete(`${this.base}/drivers/${id}`);
  }
}
