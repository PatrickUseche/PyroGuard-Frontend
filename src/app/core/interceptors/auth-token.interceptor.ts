import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { AuthService } from '../services/auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const authService = inject(AuthService);
  const token = authService.token();
  const isApiRequest = request.url.startsWith(apiBaseUrl);
  const authenticatedRequest =
    isApiRequest && token !== null
      ? request.clone({ setHeaders: { Authorization: `Token ${token}` } })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (isUnauthorized(error)) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};

function isUnauthorized(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'unauthorized'
  ) {
    return true;
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 401
  );
}
