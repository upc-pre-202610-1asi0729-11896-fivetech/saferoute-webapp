import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export interface VehicleEntity extends BaseEntity {
  plate: string;
  model: string;
  capacity: number;
  status?: string;
  driverId?: number;
  organizationId?: number;
}
