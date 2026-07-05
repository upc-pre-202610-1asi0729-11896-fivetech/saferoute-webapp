import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VehicleEntity } from '../domain/model/vehicle-entity';

export class VehicleApiEndpoint {
  private readonly url = `${environment.platformProviderApiBaseUrl}/vehicles`;

  constructor(private readonly http: HttpClient) {}

  getByOrganization(organizationId: number | string): Observable<VehicleEntity[]> {
    return this.http.get<VehicleEntity[]>(`${this.url}?organizationId=${organizationId}`);
  }

  create(vehicle: Omit<VehicleEntity, 'id'>): Observable<VehicleEntity> {
    return this.http.post<VehicleEntity>(this.url, vehicle);
  }

  update(vehicle: VehicleEntity): Observable<VehicleEntity> {
    return this.http.put<VehicleEntity>(`${this.url}/${vehicle.id}`, vehicle);
  }

  delete(id: number | string): Observable<unknown> {
    return this.http.delete(`${this.url}/${id}`);
  }
}
