import { Routes } from '@angular/router';
import { Home } from './shared/presentation/views/home/home';
import { authGuard } from './iam/infrastructure/auth.guard';

const about = () => import('./shared/presentation/views/about/about').then(m => m.About);
const pageNotFound = () => import('./shared/presentation/views/page-not-found/page-not-found').then(m => m.PageNotFound);
const checkout = () => import('./subscription/presentation/views/checkout/checkout').then(m => m.Checkout);
const iamRoutes = () => import('./iam/presentation/iam.routes').then(m => m.iamRoutes);
const routesManagementRoutes = () => import('./routes-management/presentation/routes-management.routes').then(m => m.routesManagementRoutes);
const tripRoutes = () => import('./trip/presentation/trip.routes').then(m => m.tripRoutes);
const notificationRoutes = () => import('./routes-management/presentation/routes-management.routes').then(m => m.notificationRoutes);
const stakeholderRoutes = () => import('./stakeholder/presentation/stakeholder.routes').then(m => m.stakeholderRoutes);
const subscriptionRoutes = () => import('./subscription/presentation/subscription.routes').then(m => m.subscriptionRoutes);

const baseTitle = 'SafeRoute';

export const routes: Routes = [
  { path: 'home', component: Home, title: `${baseTitle} - Home` },
  { path: 'about', loadComponent: about, title: `${baseTitle} - About` },
  { path: 'iam', loadChildren: iamRoutes },
  {
    path: 'routes-management',
    loadChildren: routesManagementRoutes,
    canActivate: [authGuard]
  },
  {
    path: 'trip',
    loadChildren: tripRoutes,
    canActivate: [authGuard]
  },
  {
    path: 'notifications',
    loadChildren: notificationRoutes,
    canActivate: [authGuard]
  },
  {
    path: 'stakeholder',
    loadChildren: stakeholderRoutes,
    canActivate: [authGuard]
  },
  {
    path: 'subscription',
    loadChildren: subscriptionRoutes,
    canActivate: [authGuard]
  },
  { path: 'checkout', loadComponent: checkout, title: `${baseTitle} - Checkout` },
  { path: '', redirectTo: '/iam/sign-in', pathMatch: 'full' },
  { path: '**', loadComponent: pageNotFound, title: `${baseTitle} - Page Not Found` }
];
