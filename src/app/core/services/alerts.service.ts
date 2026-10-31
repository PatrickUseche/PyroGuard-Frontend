import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { Alert } from '../../shared/models/alert.model';
import { AlertStatus } from '../../shared/models/alert-status.model';
import { QueryParameters, createHttpParams } from '../../shared/utils/http-params.util';
import { ApiError } from '../../shared/models/api-error.model';

export interface AlertFilters extends QueryParameters {
  status?: AlertStatus;
  level?: 'WARNING' | 'FIRE';
  node_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedAlerts {
  items: Alert[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getActive(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiBaseUrl}/alerts/active/`);
  }

  getAll(filters: AlertFilters = {}): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiBaseUrl}/alerts/`, {
      params: createHttpParams(filters),
    });
  }

  getPage(filters: AlertFilters = {}): Observable<PaginatedAlerts> {
    return this.http
      .get<Alert[]>(`${this.apiBaseUrl}/alerts/`, {
        params: createHttpParams(filters),
        observe: 'response',
      })
      .pipe(map((response) => this.toPaginatedAlerts(response)));
  }

  acknowledge(id: number): Observable<Alert> {
    return this.http.post<Alert>(`${this.apiBaseUrl}/alerts/${id}/acknowledge/`, {});
  }

  close(id: number): Observable<Alert> {
    return this.http.post<Alert>(`${this.apiBaseUrl}/alerts/${id}/close/`, {});
  }

  private toPaginatedAlerts(response: HttpResponse<Alert[]>): PaginatedAlerts {
    const items = response.body;
    const totalHeader = response.headers.get('X-Total-Count');
    const total =
      totalHeader !== null && /^\d+$/.test(totalHeader.trim())
        ? Number(totalHeader)
        : Number.NaN;

    if (items === null || !Number.isSafeInteger(total) || total < 0) {
      throw {
        kind: 'unknown',
        message: 'La respuesta de alertas no incluyó los datos o el total esperado.',
      } satisfies ApiError;
    }

    return { items, total };
  }
}
