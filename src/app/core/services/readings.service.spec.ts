import { HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { ApiError } from '../../shared/models/api-error.model';
import { ReadingsService } from './readings.service';

describe('ReadingsService', () => {
  let service: ReadingsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ReadingsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should send reading filters and return the total count header', () => {
    let result: { items: unknown[]; total: number } | undefined;

    service
      .getAll({
        node_id: 'node-1',
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-02T00:00:00Z',
        range: '24h',
        limit: 50,
        offset: 10,
        order: 'asc',
      })
      .subscribe((response) => (result = response));

    const request = httpTestingController.expectOne(
      (candidate) => candidate.url === 'https://api.test/api/readings/',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('node_id')).toBe('node-1');
    expect(request.request.params.get('from')).toBe('2026-10-01T00:00:00Z');
    expect(request.request.params.get('to')).toBe('2026-10-02T00:00:00Z');
    expect(request.request.params.get('range')).toBe('24h');
    expect(request.request.params.get('limit')).toBe('50');
    expect(request.request.params.get('offset')).toBe('10');
    expect(request.request.params.get('order')).toBe('asc');

    request.flush([], {
      headers: new HttpHeaders({ 'X-Total-Count': '87' }),
    });

    expect(result).toEqual({ items: [], total: 87 });
  });

  it('should request readings for a node', () => {
    service.getForNode('node-1').subscribe();

    const request = httpTestingController.expectOne('https://api.test/api/nodes/node-1/readings/');
    expect(request.request.method).toBe('GET');
    request.flush([], {
      headers: new HttpHeaders({ 'X-Total-Count': '0' }),
    });
  });

  it('should fetch ordered series readings for a node and selected range', () => {
    service.getSeries('node-1', '7d').subscribe();

    const request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.test/api/nodes/node-1/readings/' &&
        candidate.params.get('range') === '7d',
    );
    expect(request.request.params.get('order')).toBe('asc');
    expect(request.request.params.get('limit')).toBe('500');
    request.flush([], {
      headers: new HttpHeaders({ 'X-Total-Count': '0' }),
    });
  });

  it('should report an invalid API response when the total header is missing', () => {
    let actualError: ApiError | undefined;

    service.getAll().subscribe({
      error: (error: ApiError) => (actualError = error),
    });

    httpTestingController.expectOne('https://api.test/api/readings/').flush([]);

    expect(actualError).toEqual({
      kind: 'unknown',
      message: 'La respuesta de lecturas no incluyó los datos o el total esperado.',
    });
  });
});
