import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { AuthService } from '../services/auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const authService = inject(AuthService);
  const token = authService.token();
  const isApiRequest = isApiUrl(request.url, apiBaseUrl);
  const authenticatedRequest =
    isApiRequest && token !== null
      ? request.clone({ setHeaders: { Authorization: `Token ${token}` } })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (isUnauthorized(error)) {
        authService.clearSession();
      }
      return throwError(() => error);
    }),
  );
};

function isApiUrl(requestUrl: string, apiBaseUrl: string): boolean {
  try {
    const apiUrl = new URL(apiBaseUrl);
    const candidateUrl = new URL(requestUrl, apiUrl);
    const apiPath = apiUrl.pathname.replace(/\/+$/, '');
    return (
      candidateUrl.origin === apiUrl.origin &&
      (candidateUrl.pathname === apiPath || candidateUrl.pathname.startsWith(`${apiPath}/`))
    );
  } catch {
    return false;
  }
}

function isUnauthorized(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    error.kind === 'unauthorized'
  ) {
    return true;
  }

  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
}
