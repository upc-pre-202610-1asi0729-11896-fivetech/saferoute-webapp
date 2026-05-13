import { Routes } from '@angular/router';

const alertCenter = () => import('./views/incident-report/incident-report').then(m => m.IncidentReport);
const notificationList = () => import('./components/notification-list/notification-list').then(m => m.NotificationList);

export const notificationRoutes: Routes = [
  { path: 'alerts', loadComponent: alertCenter, title: 'SafeRoute - Alert Center' },
  { path: 'messages', loadComponent: notificationList, title: 'SafeRoute - Notifications' },
  { path: '', redirectTo: 'alerts', pathMatch: 'full' }
];
