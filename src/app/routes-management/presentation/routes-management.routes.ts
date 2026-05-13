import { Routes } from '@angular/router';

const routeList = () => import('./views/route-list/route-list').then(m => m.RouteList);
const routeForm = () => import('./views/route-form/route-form').then(m => m.RouteForm);

export const routesManagementRoutes: Routes = [
  { path: 'routes',          loadComponent: routeList, title: 'SafeRoute - Routes' },
  { path: 'routes/new',      loadComponent: routeForm, title: 'SafeRoute - New Route' },
  { path: 'routes/:id/edit', loadComponent: routeForm, title: 'SafeRoute - Edit Route' },
  { path: '',                redirectTo: 'routes', pathMatch: 'full' }
];
