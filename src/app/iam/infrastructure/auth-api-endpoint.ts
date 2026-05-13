import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  UserResource,
  OrganizationResource,
  CreateOrganizationRequest
} from './user-response';

const DB_KEY = 'saferoute.db';

function getDb(): any {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveDb(db: any): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function seedDb(): void {
  if (localStorage.getItem(DB_KEY)) return;
  const db = {
    users: [
      { id: 1, firstName: 'Admin', lastName: 'SafeRoute', email: 'admin@saferoute.com', password: 'admin123', role: 'ADMIN', organizationId: 1 },
      { id: 2, firstName: 'Carlos', lastName: 'Ramos', email: 'driver@saferoute.com', password: 'driver123', role: 'DRIVER', organizationId: 1 },
      { id: 3, firstName: 'Maria', lastName: 'Lopez', email: 'parent@saferoute.com', password: 'parent123', role: 'PARENT', organizationId: 1 }
    ],
    organizations: [
      { id: 1, name: 'SafeRoute School Transport', status: 'ACTIVE', createdAt: '2024-01-01' }
    ],
    nextUserId: 4,
    nextOrgId: 2
  };
  saveDb(db);
}

@Injectable({ providedIn: 'root' })
export class AuthApiEndpoint {
  private readonly base = environment.platformProviderApiBaseUrl;
  private readonly signInPath = environment.platformProviderSignInEndpointPath;
  private readonly signUpPath = environment.platformProviderSignUpEndpointPath;
  private readonly usersPath = environment.platformProviderUsersEndpointPath;
  private readonly orgsPath = environment.platformProviderOrganizationsEndpointPath;

  constructor(private http: HttpClient) {
    if (environment.useFakeAuth) seedDb();
  }

  signIn(req: SignInRequest): Observable<SignInResponse> {
    if (environment.useFakeAuth) {
      return this.fakeSignIn(req);
    }
    // Query json-server's /users endpoint with email and password
    return this.http.get<UserResource[]>(`${this.base}${this.usersPath}?email=${req.email}&password=${req.password}`).pipe(
      map(users => {
        if (!users || users.length === 0) {
          throw new Error('invalid-credentials');
        }
        const user = users[0];
        const token = `fake-token-${user.id}-${Date.now()}`;
        return { token, id: user.id, role: user.role, organizationId: user.organizationId };
      }),
      catchError(err => throwError(() => err))
    );
  }

  signUp(req: SignUpRequest): Observable<UserResource> {
    if (environment.useFakeAuth) {
      return this.fakeSignUp(req);
    }
    // json-server supports POST directly to the collection for creation
    return this.http.post<UserResource>(`${this.base}${this.usersPath}`, req).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getUsers(): Observable<UserResource[]> {
    if (environment.useFakeAuth) {
      const db = getDb();
      return of(db.users ?? []);
    }
    return this.http.get<UserResource[]>(`${this.base}${this.usersPath}`).pipe(
      map(r => Array.isArray(r) ? r : (r as any).users ?? []),
      catchError(err => throwError(() => err))
    );
  }

  getUserById(id: number): Observable<UserResource> {
    if (environment.useFakeAuth) {
      const db = getDb();
      const user = (db.users ?? []).find((u: any) => u.id === id);
      return user ? of(user) : throwError(() => new Error('User not found'));
    }
    return this.http.get<UserResource>(`${this.base}${this.usersPath}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getOrganizationById(id: number): Observable<OrganizationResource> {
    if (environment.useFakeAuth) {
      const db = getDb();
      const org = (db.organizations ?? []).find((o: any) => o.id === id);
      return org ? of(org) : throwError(() => new Error('Organization not found'));
    }
    return this.http.get<OrganizationResource>(`${this.base}${this.orgsPath}/${id}`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  createOrganization(req: CreateOrganizationRequest): Observable<OrganizationResource> {
    if (environment.useFakeAuth) {
      const db = getDb();
      const org: OrganizationResource = { id: db.nextOrgId++, name: req.name, status: 'ACTIVE', createdAt: new Date().toISOString().split('T')[0] };
      db.organizations = [...(db.organizations ?? []), org];
      saveDb(db);
      return of(org);
    }
    return this.http.post<OrganizationResource>(`${this.base}${this.orgsPath}`, req).pipe(
      catchError(err => throwError(() => err))
    );
  }

  updateOrganization(id: number, req: Partial<CreateOrganizationRequest>): Observable<OrganizationResource> {
    if (environment.useFakeAuth) {
      const db = getDb();
      const idx = (db.organizations ?? []).findIndex((o: any) => o.id === id);
      if (idx === -1) return throwError(() => new Error('Organization not found'));
      db.organizations[idx] = { ...db.organizations[idx], ...req };
      saveDb(db);
      return of(db.organizations[idx]);
    }
    return this.http.put<OrganizationResource>(`${this.base}${this.orgsPath}/${id}`, req).pipe(
      catchError(err => throwError(() => err))
    );
  }

  private fakeSignIn(req: SignInRequest): Observable<SignInResponse> {
    const db = getDb();
    const user = (db.users ?? []).find((u: any) => u.email === req.email && u.password === req.password);
    if (!user) return throwError(() => new Error('invalid-credentials'));
    const token = `fake-token-${user.id}-${Date.now()}`;
    return of({ token, id: user.id, role: user.role, organizationId: user.organizationId });
  }

  private fakeSignUp(req: SignUpRequest): Observable<UserResource> {
    const db = getDb();
    const exists = (db.users ?? []).some((u: any) => u.email === req.email);
    if (exists) return throwError(() => new Error('Email already registered'));
    const user = { id: db.nextUserId++, ...req };
    db.users = [...(db.users ?? []), user];
    saveDb(db);
    return of(user);
  }
}
