import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApi } from '../../shared/infrastructure/base-api';
import {
  CreateOrganizationRequest,
  OrganizationResource,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  UserResource,
} from './user-response';
import { AuthApiEndpoint } from './auth-api-endpoint';

@Injectable({ providedIn: 'root' })
export class IamApi extends BaseApi {
  constructor(private readonly authEndpoint: AuthApiEndpoint) {
    super();
  }

  signIn(req: SignInRequest): Observable<SignInResponse> {
    return this.authEndpoint.signIn(req);
  }

  signUp(req: SignUpRequest): Observable<UserResource> {
    return this.authEndpoint.signUp(req);
  }

  getUsers(): Observable<UserResource[]> {
    return this.authEndpoint.getUsers();
  }

  getUserById(id: number): Observable<UserResource> {
    return this.authEndpoint.getUserById(id);
  }

  getOrganizationById(id: number | string): Observable<OrganizationResource> {
    return this.authEndpoint.getOrganizationById(id);
  }

  createOrganization(req: CreateOrganizationRequest): Observable<OrganizationResource> {
    return this.authEndpoint.createOrganization(req);
  }

  updateOrganization(id: number | string, req: Partial<CreateOrganizationRequest>): Observable<OrganizationResource> {
    return this.authEndpoint.updateOrganization(id, req);
  }
}
