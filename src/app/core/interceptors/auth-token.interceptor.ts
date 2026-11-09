import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../config/api-base-url.token';
import { AuthService } from '../services/auth.service';
import { safeReturnUrl } from '../guards/auth.guard';

let loginRedirectInProgress = false;

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token();
  const isApiRequest = isApiUrl(request.url, apiBaseUrl);
  const authenticatedRequest =
    isApiRequest && token !== null
      ? request.clone({ setHeaders: { Authorization: `Token ${token}` } })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (isApiRequest && isUnauthorized(error)) {
        if (isGoogleAuthRequest(request.url, apiBaseUrl)) {
          return throwError(() => error);
        }

        const isRestoringSession =
          isAuthMeRequest(request.url, apiBaseUrl) && authService.restoring();
        authService.clearSession();
        if (!isRestoringSession) {
          redirectToLogin(router);
        }
      }
      return throwError(() => error);
    }),
  );
};

function redirectToLogin(router: Router): void {
  const currentPath = router.url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  if (loginRedirectInProgress || currentPath === '/login' || currentPath === '/registro') {
    return;
  }

  loginRedirectInProgress = true;
  void router
    .navigate(['/login'], {
      queryParams: { returnUrl: safeReturnUrl(router.url) },
    })
    .finally(() => {
      loginRedirectInProgress = false;
    });
}

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

function isGoogleAuthRequest(requestUrl: string, apiBaseUrl: string): boolean {
  try {
    const apiUrl = new URL(apiBaseUrl);
    const candidateUrl = new URL(requestUrl, apiUrl);
    const apiPath = apiUrl.pathname.replace(/\/+$/, '');
    const googleAuthPath = `${apiPath}/auth/google`;
    const requestPath = candidateUrl.pathname.replace(/\/+$/, '');
    return (
      candidateUrl.origin === apiUrl.origin &&
      (requestPath === googleAuthPath || requestPath.startsWith(`${googleAuthPath}/`))
    );
  } catch {
    return false;
  }
}

function isAuthMeRequest(requestUrl: string, apiBaseUrl: string): boolean {
  try {
    const apiUrl = new URL(apiBaseUrl);
    const candidateUrl = new URL(requestUrl, apiUrl);
    const apiPath = apiUrl.pathname.replace(/\/+$/, '');
    return (
      candidateUrl.origin === apiUrl.origin &&
      candidateUrl.pathname.replace(/\/+$/, '') === `${apiPath}/auth/me`
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
