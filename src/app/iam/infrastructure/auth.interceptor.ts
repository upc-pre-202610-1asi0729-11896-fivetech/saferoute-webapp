import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const TOKEN_KEY = 'saferoute.token';
const USER_KEY = 'saferoute.user';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const token = localStorage.getItem(TOKEN_KEY);
  const handledRequest = token
    ? request.clone({ headers: request.headers.set('Authorization', `Bearer ${token}`) })
    : request;

  return next(handledRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        router.navigate(['/iam/sign-in']).then();
      }
      return throwError(() => error);
    }),
  );
};
