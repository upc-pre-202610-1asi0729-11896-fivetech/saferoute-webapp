import { BaseResource, BaseResponse } from '../../shared/infrastructure/base-response';

export interface UserResource extends BaseResource {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId?: number;
}

export interface UsersResponse extends BaseResponse {
  users: UserResource[];
}

export interface OrganizationResource extends BaseResource {
  name: string;
  status: string;
  createdAt: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  token: string;
  id: number;
  role: string;
  organizationId?: number;
}

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  organizationId?: number;
}

export interface CreateOrganizationRequest {
  name: string;
}
