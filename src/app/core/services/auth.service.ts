import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { finalize, map, Observable, Subscription, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';

interface LoginResponse {
  token: string;
}

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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'pyroguard-token';
  private readonly tokenState = signal<string | null>(this.readStoredToken());
  private readonly currentUserState = signal<AuthUser | null>(null);
  private restoreSubscription: Subscription | null = null;

  readonly token = this.tokenState.asReadonly();
  readonly currentUser = this.currentUserState.asReadonly();
  readonly canManageAlerts = computed(() => this.currentUserState()?.canManageAlerts ?? false);
  readonly isAuthenticated = computed(() => this.tokenState() !== null);
  readonly restoring = signal(this.tokenState() !== null);
  readonly authError = signal<string | null>(null);

  loginWithGoogle(credential: string): Observable<void> {
    this.authError.set(null);
    return this.http
      .post<GoogleLoginResponse>(`${this.apiBaseUrl}/auth/google/`, { credential })
      .pipe(
        tap(({ token, user }) => {
          if (token.trim() === '') {
            throw new Error('El servidor devolvió un token vacío.');
          }
          this.tokenState.set(token);
          this.persistToken(token);
          this.currentUserState.set(this.toAuthUser(user));
          this.restoring.set(false);
        }),
        map(() => undefined),
      );
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
    if (this.tokenState() === null) {
      this.clearSession();
      return;
    }

    this.authError.set(null);
    this.http
      .post<void>(`${this.apiBaseUrl}/auth/logout/`, {})
      .pipe(finalize(() => this.clearSession()))
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

  login(username: string, password: string): Observable<void> {
    return this.http
      .post<LoginResponse>(`${this.apiBaseUrl}/auth/login/`, { username, password })
      .pipe(
        tap(({ token }) => {
          if (token.trim() === '') {
            throw new Error('El servidor devolvió un token vacío.');
          }
          this.tokenState.set(token);
          this.persistToken(token);
        }),
        map(() => undefined),
      );
  }

  private toAuthUser(user: ApiUser): AuthUser {
    return {
      username: user.username,
      email: user.email,
      name: user.name,
      canManageAlerts: user.can_manage_alerts,
    };
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
