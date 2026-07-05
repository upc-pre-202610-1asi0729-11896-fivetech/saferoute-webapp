import { NotificationEntity } from '../domain/model/notification-entity';
import { NotificationResource } from './notification-response';

export class NotificationAssembler {
  toEntityFromResource(resource: NotificationResource): NotificationEntity {
    return {
      id: resource.id,
      title: resource.category,
      body: resource.message,
      date: resource.deliveredAt ?? '',
      read: resource.deliveryState === 'DELIVERED',
      userId: resource.recipientId,
      type: resource.category,
    };
  }
}
