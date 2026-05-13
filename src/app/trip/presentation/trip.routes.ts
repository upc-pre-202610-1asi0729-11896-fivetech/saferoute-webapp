import { Routes } from '@angular/router';

const tripList         = () => import('./views/trip-list/trip-list').then(m => m.TripList);
const tripForm         = () => import('./views/trip-form/trip-form').then(m => m.TripForm);
const liveMonitor      = () => import('./views/live-monitor/live-monitor').then(m => m.LiveMonitor);
const parentTracking   = () => import('./views/parent-tracking/parent-tracking').then(m => m.ParentTracking);
const activeTrip       = () => import('./views/active-trip/active-trip').then(m => m.ActiveTrip);
const attendanceHistory = () => import('./views/attendance-history/attendance-history').then(m => m.AttendanceHistory);

export const tripRoutes: Routes = [
  { path: 'list',       loadComponent: activeTrip,        title: 'SafeRoute - My Trip' },
  { path: 'new',        loadComponent: tripForm,          title: 'SafeRoute - New Trip' },
  { path: 'edit/:id',   loadComponent: tripForm,          title: 'SafeRoute - Edit Trip' },
  { path: 'monitor',    loadComponent: liveMonitor,       title: 'SafeRoute - Trip Monitor' },
  { path: 'tracking',   loadComponent: parentTracking,    title: 'SafeRoute - Track Bus' },
  { path: 'attendance', loadComponent: attendanceHistory, title: 'SafeRoute - Attendance History' },
  { path: 'all',        loadComponent: tripList,          title: 'SafeRoute - All Trips' },
  { path: '',           redirectTo: 'monitor', pathMatch: 'full' }
];
