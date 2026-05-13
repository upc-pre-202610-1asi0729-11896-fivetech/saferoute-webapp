import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('saferoute.token');
  if (!token) {
    return router.createUrlTree(['/iam/sign-in'], { queryParams: { redirect: state.url } });
  }
  return true;
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('saferoute.token');
  if (token) {
    return router.createUrlTree(['/home']);
  }
  return true;
};
