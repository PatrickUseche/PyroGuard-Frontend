import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, of, take } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  auth.restoreSession();
  return sessionRestored(auth).pipe(
    map((hasSession) =>
      hasSession
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { returnUrl: safeReturnUrl(state.url) },
          }),
    ),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  auth.restoreSession();
  return sessionRestored(auth).pipe(
    map((hasSession) => (hasSession ? router.parseUrl('/') : true)),
  );
};

export function safeReturnUrl(value: string | null): string {
  return value !== null && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function sessionRestored(auth: AuthService) {
  if (!auth.restoring()) {
    return of(auth.currentUser() !== null);
  }

  return toObservable(auth.restoring).pipe(
    filter((restoring) => !restoring),
    take(1),
    map(() => auth.currentUser() !== null),
  );
}
