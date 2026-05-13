import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export interface SubscriptionEntity extends BaseEntity {
  planId: number;
  organizationId: number;
  status: string;
  startDate: string;
  endDate: string;
  planName?: string;
  planPrice?: number;
}
