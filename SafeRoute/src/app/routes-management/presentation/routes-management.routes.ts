import {Routes} from '@angular/router';

const routeList = () => import('./views/route-list/route-list').then(m => m.RouteList);
const routeForm = () => import('./views/route-form/route-form').then(m => m.RouteForm);
const stopList = () => import('./views/stop-list/stop-list').then(m => m.StopList);
const stopForm = () => import('./views/stop-form/stop-form').then(m => m.StopForm);

export const routesManagementRoutes: Routes = [
  { path: 'routes', loadComponent: routeList },
  { path: 'routes/new', loadComponent: routeForm },
  { path: 'routes/:id/edit', loadComponent: routeForm },
  { path: 'stops', loadComponent: stopList },
  { path: 'stops/new', loadComponent: stopForm },
  { path: 'stops/:id/edit', loadComponent: stopForm }
];
