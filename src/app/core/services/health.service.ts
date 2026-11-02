import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { HealthStatus } from '../../shared/models/health-status.model';
import { ApiError } from '../../shared/models/api-error.model';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly http = new HttpClient(inject(HttpBackend));

  check(): Observable<HealthStatus> {
    return this.http.get<unknown>(`${this.apiBaseUrl}/health/`).pipe(
      map((): HealthStatus => 'online'),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 429) {
          const retryAfter = parseRetryAfter(error.headers.get('Retry-After'));
          const throttledError: ApiError = {
            kind: 'throttled',
            message: 'Demasiadas consultas al servicio de estado.',
            ...(retryAfter === undefined ? {} : { retryAfter }),
          };
          return throwError(() => throttledError);
        }
        return of(this.toHealthStatus(error));
      }),
    );
  }

  private toHealthStatus(error: unknown): HealthStatus {
    if (!(error instanceof HttpErrorResponse)) {
      return 'unknown';
    }
    if (error.status === 404) {
      return 'unknown';
    }
    if (error.status === 0) {
      return 'offline';
    }
    return 'unknown';
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }
  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt) ? undefined : Math.max(0, (retryAt - Date.now()) / 1000);
}
