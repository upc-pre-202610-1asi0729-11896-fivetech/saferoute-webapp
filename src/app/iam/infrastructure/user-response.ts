import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface UserResource extends BaseResource {
  username: string;
  organizationId?: number | string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export interface UsersResponse extends BaseResponse {
  users: UserResource[];
}

export interface OrganizationResource extends BaseResource {
  name: string;
  legalIdentifier?: string;
  status?: string;
  createdAt?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  token: string;
  id: number;
  username: string;
  role?: string;
  organizationId?: number | string;
}

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  organizationId?: number | string;
}

export interface CreateOrganizationRequest {
  name: string;
  legalIdentifier?: string;
}
