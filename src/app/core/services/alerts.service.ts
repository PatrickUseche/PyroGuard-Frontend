import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { Alert } from '../../shared/models/alert.model';
import { AlertStatus } from '../../shared/models/alert-status.model';
import { QueryParameters, createHttpParams } from '../../shared/utils/http-params.util';

export interface AlertFilters extends QueryParameters {
  status?: AlertStatus;
  level?: 'WARNING' | 'FIRE';
  node_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
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

  acknowledge(id: number): Observable<Alert> {
    return this.http.post<Alert>(`${this.apiBaseUrl}/alerts/${id}/acknowledge/`, {});
  }

  close(id: number): Observable<Alert> {
    return this.http.post<Alert>(`${this.apiBaseUrl}/alerts/${id}/close/`, {});
  }
}
