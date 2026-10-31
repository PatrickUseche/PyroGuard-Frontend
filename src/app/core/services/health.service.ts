import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { HealthStatus } from '../../shared/models/health-status.model';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly http = new HttpClient(inject(HttpBackend));

  check(): Observable<HealthStatus> {
    return this.http.get<unknown>(`${this.apiBaseUrl}/health/`).pipe(
      map((): HealthStatus => 'online'),
      catchError((error: unknown) => of(this.toHealthStatus(error))),
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
