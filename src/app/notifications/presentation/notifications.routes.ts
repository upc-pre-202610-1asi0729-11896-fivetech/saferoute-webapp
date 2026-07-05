import { Routes } from '@angular/router';

const alertCenter = () => import('./views/incident-report/incident-report').then(m => m.IncidentReport);
const alertForm = () => import('./views/alert-form/alert-form').then(m => m.AlertForm);
const notificationList = () => import('./components/notification-list/notification-list').then(m => m.NotificationList);

export const notificationRoutes: Routes = [
  { path: 'alerts', loadComponent: alertCenter, title: 'SafeRoute - Alert Center' },
  { path: 'alerts/new', loadComponent: alertForm, title: 'SafeRoute - New Alert' },
  { path: 'messages', loadComponent: notificationList, title: 'SafeRoute - Notifications' },
  { path: '', redirectTo: 'alerts', pathMatch: 'full' }
];
