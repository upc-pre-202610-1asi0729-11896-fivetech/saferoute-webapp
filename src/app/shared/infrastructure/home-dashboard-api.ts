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
    const q = organizationId ? `?organizationId=${organizationId}` : '';
    return forkJoin({
      routes: this.http.get<any[]>(`${this.base}/routes${q}`).pipe(catchError(() => of([]))),
      trips: this.http.get<any[]>(`${this.base}/trips${q}`).pipe(catchError(() => of([]))),
      users: this.http.get<any[]>(`${this.base}/users`).pipe(catchError(() => of([]))),
      drivers: this.http.get<any[]>(`${this.base}/drivers`).pipe(catchError(() => of([]))),
      parents: this.http.get<any[]>(`${this.base}/parents`).pipe(catchError(() => of([]))),
    }).pipe(
      map(data => {
        const parents = organizationId
          ? (data.parents ?? []).filter((p: any) => p.organizationId?.toString() === organizationId.toString())
          : (data.parents ?? []);
        return {
          routes: data.routes ?? [],
          trips: data.trips ?? [],
          users: [...(data.users ?? []), ...(data.drivers ?? [])],
          parents,
          children: parents.flatMap((p: any) => (p.children ?? []).map((c: any) => ({
            id: c.id,
            name: c.fullName,
            grade: c.school,
            parentId: p.id,
          }))),
        };
      })
    );
  }
}
