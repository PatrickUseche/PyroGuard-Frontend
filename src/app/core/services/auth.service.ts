import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, finalize, map, Observable, of, Subscription, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { ApiError } from '../../shared/models/api-error.model';

interface ApiUser {
  username: string;
  email: string;
  name: string;
  can_manage_alerts: boolean;
}

interface GoogleLoginResponse {
  token: string;
  user: ApiUser;
}

export interface AuthUser {
  username: string;
  email: string;
  name: string;
  canManageAlerts: boolean;
}

export interface PendingGoogleRegistration {
  credential: string;
  email: string;
  name: string;
  suggestedUsername: string;
  notice?: string;
}

export type GoogleLoginResult = { kind: 'signed-in' } | { kind: 'registration-required' };

const INVALID_GOOGLE_CREDENTIAL = 'No se pudo verificar la cuenta de Google.';
const EXPIRED_GOOGLE_CREDENTIAL = 'La verificación de Google venció. Verifica tu cuenta otra vez.';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'pyroguard-token';
  private readonly tokenState = signal<string | null>(this.readStoredToken());
  private readonly currentUserState = signal<AuthUser | null>(null);
  private readonly pendingRegistrationState = signal<PendingGoogleRegistration | null>(null);
  private restoreSubscription: Subscription | null = null;

  readonly token = this.tokenState.asReadonly();
  readonly currentUser = this.currentUserState.asReadonly();
  readonly pendingRegistration = this.pendingRegistrationState.asReadonly();
  readonly canManageAlerts = computed(() => this.currentUserState()?.canManageAlerts ?? false);
  readonly isAuthenticated = computed(() => this.tokenState() !== null);
  readonly restoring = signal(this.tokenState() !== null);
  readonly authError = signal<string | null>(null);

  loginWithGoogle(credential: string): Observable<GoogleLoginResult> {
    this.authError.set(null);
    return this.http
      .post<GoogleLoginResponse>(`${this.apiBaseUrl}/auth/google/`, { credential })
      .pipe(
        tap((response) => this.startSession(response)),
        map(() => ({ kind: 'signed-in' as const })),
        catchError((error: unknown) => {
          const pending = this.registrationFromError(error, credential);
          if (pending === null) {
            return throwError(() => error);
          }
          this.pendingRegistrationState.set(pending);
          return of({ kind: 'registration-required' as const });
        }),
      );
  }

  registerWithGoogle(username: string): Observable<void> {
    const pending = this.pendingRegistrationState();
    if (pending === null) {
      return throwError(
        () =>
          ({
            kind: 'unknown',
            message: 'Verifica tu cuenta de Google antes de crearla.',
          }) satisfies ApiError,
      );
    }

    this.authError.set(null);
    return this.http
      .post<GoogleLoginResponse>(`${this.apiBaseUrl}/auth/google/register/`, {
        credential: pending.credential,
        username,
      })
      .pipe(
        tap((response) => {
          this.startSession(response);
          this.pendingRegistrationState.set(null);
        }),
        map(() => undefined),
        catchError((error: unknown) => {
          if (!this.isInvalidCredential(error)) {
            return throwError(() => error);
          }

          this.pendingRegistrationState.set(null);
          return throwError(() => this.expiredCredentialError(error));
        }),
      );
  }

  cancelRegistration(): void {
    this.pendingRegistrationState.set(null);
  }

  restoreSession(): void {
    if (
      this.tokenState() === null ||
      this.currentUserState() !== null ||
      this.restoreSubscription !== null
    ) {
      return;
    }

    this.authError.set(null);
    this.restoring.set(true);
    this.restoreSubscription = this.http
      .get<ApiUser>(`${this.apiBaseUrl}/auth/me/`)
      .pipe(
        map((user) => this.toAuthUser(user)),
        tap((user) => this.currentUserState.set(user)),
        finalize(() => {
          this.restoring.set(false);
          this.restoreSubscription = null;
        }),
      )
      .subscribe({
        error: (error: unknown) => this.authError.set(this.getErrorMessage(error)),
      });
  }

  logout(): void {
    this.cancelRegistration();
    const token = this.tokenState();
    if (token === null) {
      this.clearSession();
      return;
    }

    this.authError.set(null);
    this.clearSession();
    this.http
      .post<void>(
        `${this.apiBaseUrl}/auth/logout/`,
        {},
        { headers: { Authorization: `Token ${token}` } },
      )
      .subscribe({
        error: (error: unknown) => this.authError.set(this.getErrorMessage(error)),
      });
  }

  clearSession(): void {
    this.tokenState.set(null);
    this.currentUserState.set(null);
    this.restoring.set(false);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.storageKey);
    }
  }

  private toAuthUser(user: ApiUser): AuthUser {
    return {
      username: user.username,
      email: user.email,
      name: user.name,
      canManageAlerts: user.can_manage_alerts,
    };
  }

  private startSession({ token, user }: GoogleLoginResponse): void {
    if (token.trim() === '') {
      throw new Error('El servidor devolvió un token vacío.');
    }
    this.tokenState.set(token);
    this.persistToken(token);
    this.currentUserState.set(this.toAuthUser(user));
    this.restoring.set(false);
  }

  private registrationFromError(
    error: unknown,
    credential: string,
  ): PendingGoogleRegistration | null {
    if (!isApiError(error) || error.code !== 'registration_required' || error.data === undefined) {
      return null;
    }

    const { email, name, suggested_username: suggestedUsername } = error.data;
    if (
      typeof email !== 'string' ||
      typeof name !== 'string' ||
      typeof suggestedUsername !== 'string'
    ) {
      return null;
    }

    return { credential, email, name, suggestedUsername };
  }

  private isInvalidCredential(error: unknown): error is ApiError {
    return isApiError(error) && error.message === INVALID_GOOGLE_CREDENTIAL;
  }

  private expiredCredentialError(error: ApiError): ApiError {
    return { ...error, message: EXPIRED_GOOGLE_CREDENTIAL };
  }

  private getErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
    return 'No se pudo completar la operación de autenticación.';
  }

  private readStoredToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem(this.storageKey);
  }

  private persistToken(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, token);
    }
  }
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    typeof error.kind === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
