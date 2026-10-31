import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { ApiError } from '../../shared/models/api-error.model';
import { Reading } from '../../shared/models/reading.model';
import { QueryParameters, createHttpParams } from '../../shared/utils/http-params.util';

export interface ReadingFilters extends QueryParameters {
  node_id?: string;
  from?: string;
  to?: string;
  range?: '24h' | '7d';
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export interface PaginatedReadings {
  items: Reading[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class ReadingsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getAll(filters: ReadingFilters = {}): Observable<PaginatedReadings> {
    return this.http
      .get<Reading[]>(`${this.apiBaseUrl}/readings/`, {
        params: createHttpParams(filters),
        observe: 'response',
      })
      .pipe(map((response) => this.toPaginatedReadings(response)));
  }

  getForNode(nodeId: string, filters: ReadingFilters = {}): Observable<PaginatedReadings> {
    return this.http
      .get<Reading[]>(`${this.apiBaseUrl}/nodes/${encodeURIComponent(nodeId)}/readings/`, {
        params: createHttpParams(filters),
        observe: 'response',
      })
      .pipe(map((response) => this.toPaginatedReadings(response)));
  }

  private toPaginatedReadings(response: HttpResponse<Reading[]>): PaginatedReadings {
    const items = response.body;
    const totalHeader = response.headers.get('X-Total-Count');
    const total =
      totalHeader !== null && /^\d+$/.test(totalHeader.trim())
        ? Number(totalHeader)
        : Number.NaN;

    if (items === null || !Number.isSafeInteger(total) || total < 0) {
      throw {
        kind: 'unknown',
        message: 'La respuesta de lecturas no incluyó los datos o el total esperado.',
      } satisfies ApiError;
    }

    return { items, total };
  }
}
