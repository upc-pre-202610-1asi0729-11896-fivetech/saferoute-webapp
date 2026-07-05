import { PlanEntity } from '../domain/model/plan-entity';
import { SubscriptionEntity } from '../domain/model/subscription-entity';
import { SubscriptionResource } from './subscription-response';

export class SubscriptionAssembler {
  toEntityFromResource(resource: SubscriptionResource, plans: PlanEntity[] = []): SubscriptionEntity {
    const startDate = resource.activatedAt ?? '';
    const endDate = startDate ? this.addDays(startDate, 30) : '';
    return this.withPlanDetails({
      id: resource.id as unknown as number,
      organizationId: resource.organizationId,
      planId: resource.planId,
      status: resource.state,
      startDate,
      endDate: resource.state === 'CANCELLED' ? (resource.cancelledAt ?? endDate) : endDate,
    }, plans);
  }

  withPlanDetails(subscription: SubscriptionEntity, plans: PlanEntity[]): SubscriptionEntity {
    const plan = plans.find(item => item.id.toString() === subscription.planId?.toString());
    return {
      ...subscription,
      planName: plan?.name ?? subscription.planName,
      planPrice: plan?.price ?? subscription.planPrice,
    };
  }

  private addDays(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
}
