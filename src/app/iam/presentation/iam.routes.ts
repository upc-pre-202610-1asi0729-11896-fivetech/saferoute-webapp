import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../infrastructure/auth.guard';

const login = () => import('./views/login/login').then(m => m.Login);
const register = () => import('./views/register/register').then(m => m.Register);
const profile = () => import('./views/profile/profile').then(m => m.Profile);

export const iamRoutes: Routes = [
  { path: 'sign-in', loadComponent: login, canActivate: [guestGuard], title: 'SafeRoute - Sign In' },
  { path: 'sign-up', loadComponent: register, canActivate: [guestGuard], title: 'SafeRoute - Register' },
  { path: 'profile', loadComponent: profile, canActivate: [authGuard], title: 'SafeRoute - Mi Perfil' },
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' }
];
