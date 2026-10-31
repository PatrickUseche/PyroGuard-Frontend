import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { map, Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';

interface LoginResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'pyroguard-token';
  private readonly tokenState = signal<string | null>(this.readStoredToken());
  private readonly isAuthenticatedState = signal(this.tokenState() !== null);

  readonly token = this.tokenState.asReadonly();
  readonly isAuthenticated = this.isAuthenticatedState.asReadonly();

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
        map(() => {
          this.isAuthenticatedState.set(true);
        }),
      );
  }

  logout(): void {
    this.tokenState.set(null);
    this.isAuthenticatedState.set(false);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.storageKey);
    }
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
