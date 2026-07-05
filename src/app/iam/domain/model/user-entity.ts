import { BaseEntity } from '../../../shared/infrastructure/base-entity';
import { Role } from './role-enum';

export interface UserEntity extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  organizationId?: number | string;
}

export interface OrganizationEntity extends BaseEntity {
  name: string;
  legalIdentifier?: string;
  status: string;
  createdAt: string;
}
