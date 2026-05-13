import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export interface UserEntity extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId?: number;
}
