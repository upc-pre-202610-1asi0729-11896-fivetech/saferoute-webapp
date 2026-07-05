export interface NotificationResource {
  id: string;
  recipientId: string;
  category: string;
  message: string;
  deliveryState: string;
  deliveredAt: string | null;
}
