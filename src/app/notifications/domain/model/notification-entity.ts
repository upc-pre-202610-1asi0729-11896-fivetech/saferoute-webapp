export interface NotificationEntity {
  id: number | string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  userId?: number | string;
  type?: string;
}

export interface AlertRequest {
  organizationId: number | string;
  tripId?: number | string;
  message: string;
  priority: boolean;
  recipientEmail?: string;
}
