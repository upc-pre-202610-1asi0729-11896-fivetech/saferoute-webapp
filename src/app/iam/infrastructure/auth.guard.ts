import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('saferoute.token');
  const checkoutPending = localStorage.getItem('saferoute.checkoutPending') === 'true';
  const checkoutUrl = localStorage.getItem('saferoute.checkoutUrl') ?? '/checkout';
  if (!token) {
    return router.createUrlTree(['/iam/sign-in'], { queryParams: { redirect: state.url } });
  }
  if (checkoutPending) {
    return router.parseUrl(checkoutUrl);
  }
  return true;
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('saferoute.token');
  const checkoutPending = localStorage.getItem('saferoute.checkoutPending') === 'true';
  const checkoutUrl = localStorage.getItem('saferoute.checkoutUrl') ?? '/checkout';
  if (token) {
    if (checkoutPending) return router.parseUrl(checkoutUrl);
    return router.createUrlTree(['/home']);
  }
  return true;
};
