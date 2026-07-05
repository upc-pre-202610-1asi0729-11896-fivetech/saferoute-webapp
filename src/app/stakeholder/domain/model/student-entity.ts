import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export interface UserEntity extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationId?: number | string;
}

export interface ParentEntity extends BaseEntity {
  name: string;
  email: string;
  phone: string;
  status: boolean;
  organizationId: number | string;
}

export interface ChildEntity extends BaseEntity {
  name: string;
  grade: string;
  parentId: number | string;
  status: boolean;
  boardingStatus: 'ABORDADO' | 'EN_ESPERA' | 'AUSENTE';
  organizationId: number | string;
}
