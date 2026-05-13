import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Route } from '../domain/model/route-entity';
import { RouteResource } from './route-response';
import { RouteAssembler } from './route-assembler';
import { environment } from '../../../environments/environment';

export class RouteApiEndpoint {
  private readonly url = `${environment.platformProviderApiBaseUrl}/routes`;
  private readonly assembler = new RouteAssembler();

  constructor(private http: HttpClient) {}

  private handleError(op: string) {
    return (e: HttpErrorResponse) => {
      console.error(`${op} failed:`, e.message);
      return throwError(() => new Error(e.message));
    };
  }

  getAll(organizationId?: number): Observable<Route[]> {
    const url = organizationId ? `${this.url}?organizationId=${organizationId}` : this.url;
    return this.http.get<RouteResource[]>(url).pipe(
      map(arr => this.assembler.toEntitiesFromResponse(arr)),
      catchError(this.handleError('getAll'))
    );
  }

  create(route: Route): Observable<Route> {
    return this.http.post<RouteResource>(this.url, this.assembler.toResourceFromEntity(route)).pipe(
      map(r => this.assembler.toEntityFromResource(r)),
      catchError(this.handleError('create'))
    );
  }

  update(route: Route): Observable<Route> {
    return this.http.put<RouteResource>(`${this.url}/${route.id}`, this.assembler.toResourceFromEntity(route)).pipe(
      map(r => this.assembler.toEntityFromResource(r)),
      catchError(this.handleError('update'))
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      catchError(this.handleError('delete'))
    );
  }
}
