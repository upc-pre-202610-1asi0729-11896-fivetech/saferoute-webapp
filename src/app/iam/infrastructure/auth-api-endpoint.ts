import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  UserResource,
  OrganizationResource,
  CreateOrganizationRequest,
} from './user-response';

interface BackendSignInResponse {
  id: number;
  username: string;
  token: string;
}

function roleToBackend(role: string): string {
  if (role === 'ADMIN') return 'ROLE_ADMINISTRATOR';
  return role.startsWith('ROLE_') ? role : `ROLE_${role}`;
}

function normalizeError(error: HttpErrorResponse): Error {
  if (error.status === 0) return new Error('No se pudo conectar con el backend de SafeRoute');
  if (error.status === 400) return new Error('Solicitud invalida. Revisa los campos enviados.');
  if (error.status === 401) return new Error('Credenciales invalidas o sesion expirada.');
  if (error.status === 403) return new Error('No tienes permisos para realizar esta accion.');
  if (error.status === 404) return new Error('Recurso no encontrado en el backend.');
  if (error.status === 409) return new Error('Ya existe un registro con esos datos.');
  if (error.status >= 500) return new Error('El backend reporto un error interno.');
  return new Error(error.message || 'Error inesperado al consumir el backend.');
}

const DEMO_USER_PROFILES: Record<string, { firstName: string; lastName: string; email: string }> = {
  'admin@saferoute.pe': { firstName: 'Mathias', lastName: 'De La Cruz', email: 'admin@saferoute.pe' },
  'driver@saferoute.pe': { firstName: 'Carlos', lastName: 'Ramirez', email: 'driver@saferoute.pe' },
  'parent@saferoute.pe': { firstName: 'Rosita', lastName: 'Nery', email: 'parent@saferoute.pe' },
  'anonimo020606@gmail.com': { firstName: 'Rosita', lastName: 'Nery', email: 'anonimo020606@gmail.com' },
};

@Injectable({ providedIn: 'root' })
export class AuthApiEndpoint {
  private readonly base = environment.platformProviderApiBaseUrl;
  private readonly signInPath = environment.platformProviderSignInEndpointPath;
  private readonly signUpPath = environment.platformProviderSignUpEndpointPath;
  private readonly usersPath = environment.platformProviderUsersEndpointPath;
  private readonly orgsPath = environment.platformProviderOrganizationsEndpointPath;

  constructor(private http: HttpClient) {}

  signIn(req: SignInRequest): Observable<SignInResponse> {
    return this.http
      .post<BackendSignInResponse>(`${this.base}${this.signInPath}`, {
        username: req.email,
        password: req.password,
      })
      .pipe(
        switchMap(auth =>
          this.getUserById(auth.id).pipe(
            map(user => ({
              token: auth.token,
              id: auth.id,
              username: auth.username,
              role: this.toFrontendRole(user.roles?.[0]),
              organizationId: user.organizationId,
            })),
          ),
        ),
        catchError(err => throwError(() => normalizeError(err))),
      );
  }

  signUp(req: SignUpRequest): Observable<UserResource> {
    return this.http
      .post<UserResource>(`${this.base}${this.signUpPath}`, {
        username: req.email,
        password: req.password,
        organizationId: req.organizationId?.toString(),
        roles: [roleToBackend(req.role)],
      })
      .pipe(catchError(err => throwError(() => normalizeError(err))));
  }

  getUsers(): Observable<UserResource[]> {
    return this.http.get<UserResource[]>(`${this.base}${this.usersPath}`).pipe(
      map(users => (users ?? []).map(user => this.withDisplayFields(user))),
      catchError(err => throwError(() => normalizeError(err))),
    );
  }

  getUserById(id: number): Observable<UserResource> {
    return this.http.get<UserResource>(`${this.base}${this.usersPath}/${id}`).pipe(
      map(user => this.withDisplayFields(user)),
      catchError(err => throwError(() => normalizeError(err))),
    );
  }

  getOrganizationById(id: number | string): Observable<OrganizationResource> {
    return this.http.get<OrganizationResource>(`${this.base}${this.orgsPath}/${id}`).pipe(
      map(org => ({ ...org, status: org.status ?? 'ACTIVE', createdAt: org.createdAt ?? '' })),
      catchError(err => throwError(() => err instanceof Error ? err : normalizeError(err))),
    );
  }

  createOrganization(req: CreateOrganizationRequest): Observable<OrganizationResource> {
    return this.http
      .post<OrganizationResource>(`${this.base}${this.orgsPath}`, {
        name: req.name,
        legalIdentifier: req.legalIdentifier || `RUC-${Date.now()}`,
      })
      .pipe(
        map(org => ({ ...org, id: org.id as unknown as number })),
        catchError(err => throwError(() => normalizeError(err))),
      );
  }

  updateOrganization(id: number | string, req: Partial<CreateOrganizationRequest>): Observable<OrganizationResource> {
    return this.http
      .put<OrganizationResource>(`${this.base}${this.orgsPath}/${id}`, {
        name: req.name,
        legalIdentifier: req.legalIdentifier,
      })
      .pipe(
        map(org => ({ ...org, status: org.status ?? 'ACTIVE', createdAt: org.createdAt ?? '' })),
        catchError(err => throwError(() => normalizeError(err))),
      );
  }

  private withDisplayFields(user: UserResource): UserResource {
    const username = user.username ?? user.email ?? '';
    const demoProfile = DEMO_USER_PROFILES[username.toLowerCase()];
    const [first, ...rest] = username.split('@')[0].split(/[._-]/).filter(Boolean);
    const role = this.toFrontendRole(user.roles?.[0] ?? user.role ?? '');
    return {
      ...user,
      username,
      email: user.email ?? demoProfile?.email ?? username,
      firstName: user.firstName ?? demoProfile?.firstName ?? this.capitalize(first || username),
      lastName: user.lastName ?? demoProfile?.lastName ?? this.capitalize(rest.join(' ')),
      role,
    };
  }

  private toFrontendRole(role: string): string {
    const normalized = role.replace(/^ROLE_/, '');
    return normalized === 'ADMINISTRATOR' ? 'ADMIN' : normalized || 'PARENT';
  }

  private capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }
}
