export interface SubscriptionResource {
  id: string;
  organizationId: string;
  planId: string;
  state: string;
  activatedAt: string | null;
  cancelledAt: string | null;
}
