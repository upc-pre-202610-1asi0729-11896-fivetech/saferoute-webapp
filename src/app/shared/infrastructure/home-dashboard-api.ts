import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface HomeDashboardSnapshot {
  routes: any[];
  trips: any[];
  users: any[];
  parents: any[];
  children: any[];
}

@Injectable({ providedIn: 'root' })
export class HomeDashboardApi {
  private readonly base = environment.platformProviderApiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  load(organizationId?: number | string): Observable<HomeDashboardSnapshot> {
    if (!organizationId) {
      return of({ routes: [], trips: [], users: [], parents: [], children: [] });
    }
    const q = organizationId ? `?organizationId=${organizationId}` : '';
    return forkJoin({
      routes: this.http.get<any[]>(`${this.base}/routes${q}`).pipe(catchError(() => of([]))),
      trips: this.http.get<any[]>(`${this.base}/trips${q}`).pipe(catchError(() => of([]))),
      users: this.http.get<any[]>(`${this.base}/users`).pipe(catchError(() => of([]))),
      drivers: this.http.get<any[]>(`${this.base}/drivers`).pipe(catchError(() => of([]))),
      parents: this.http.get<any[]>(`${this.base}/parents`).pipe(catchError(() => of([]))),
    }).pipe(
      map(data => {
        const belongsToOrganization = (item: any) =>
          item?.organizationId?.toString() === organizationId.toString();
        const parents = (data.parents ?? []).filter(belongsToOrganization);
        const users = [...(data.users ?? []), ...(data.drivers ?? [])].filter(belongsToOrganization);
        return {
          routes: (data.routes ?? []).filter(belongsToOrganization),
          trips: (data.trips ?? []).filter(belongsToOrganization),
          users,
          parents,
          children: parents.flatMap((p: any) => (p.children ?? []).map((c: any) => ({
            id: c.id,
            name: c.fullName,
            grade: c.school,
            parentId: p.id,
            organizationId,
          }))),
        };
      })
    );
  }
}
