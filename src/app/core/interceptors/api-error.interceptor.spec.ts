import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../shared/models/api-error.model';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it.each([
    { status: 401, kind: 'unauthorized' },
    { status: 409, kind: 'conflict' },
    { status: 429, kind: 'throttled' },
    { status: 503, kind: 'server' },
    { status: 400, kind: 'unknown' },
  ])('should map HTTP $status errors to $kind', ({ status, kind }) => {
    let actualError: ApiError | undefined;

    http.get('/test').subscribe({
      error: (error: ApiError) => (actualError = error),
    });

    httpTestingController
      .expectOne('/test')
      .flush({}, { status, statusText: 'Error' });

    expect(actualError?.kind).toBe(kind);
    expect(actualError?.message.length).toBeGreaterThan(0);
  });

  it('should map network errors and include Retry-After for throttling', () => {
    let networkError: ApiError | undefined;
    http.get('/network-error').subscribe({
      error: (error: ApiError) => (networkError = error),
    });
    httpTestingController
      .expectOne('/network-error')
      .error(new ProgressEvent('error'));
    expect(networkError?.kind).toBe('network');

    let throttledError: ApiError | undefined;
    http.get('/throttled').subscribe({
      error: (error: ApiError) => (throttledError = error),
    });
    httpTestingController.expectOne('/throttled').flush(
      {},
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: new HttpHeaders({ 'Retry-After': '60' }),
      },
    );
    expect(throttledError?.kind).toBe('throttled');
    expect(throttledError?.retryAfter).toBe(60);
  });
});
