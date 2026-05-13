import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export interface PlanEntity extends BaseEntity {
  name: string;
  price: number;
  maxRoutes: number;
  maxDrivers: number;
  features: string[];
}
