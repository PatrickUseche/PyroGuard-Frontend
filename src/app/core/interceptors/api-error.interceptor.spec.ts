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
    { status: 404, kind: 'not-found' },
    { status: 429, kind: 'throttled' },
    { status: 503, kind: 'server' },
    { status: 400, kind: 'unknown' },
  ])('should map HTTP $status errors to $kind', ({ status, kind }) => {
    let actualError: ApiError | undefined;

    http.get('/test').subscribe({
      error: (error: ApiError) => (actualError = error),
    });

    httpTestingController.expectOne('/test').flush({}, { status, statusText: 'Error' });

    expect(actualError?.kind).toBe(kind);
    expect(actualError?.message.length).toBeGreaterThan(0);
  });

  it('should map network errors and include Retry-After for throttling', () => {
    let networkError: ApiError | undefined;
    http.get('/network-error').subscribe({
      error: (error: ApiError) => (networkError = error),
    });
    httpTestingController.expectOne('/network-error').error(new ProgressEvent('error'));
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

  it('should surface backend detail errors', () => {
    let actualError: ApiError | undefined;

    http.post('/auth/google/', { credential: 'invalid' }).subscribe({
      error: (error: ApiError) => (actualError = error),
    });

    httpTestingController.expectOne('/auth/google/').flush(
      {
        status: 'error',
        errors: { detail: 'No se pudo verificar la cuenta de Google.' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(actualError?.message).toBe('No se pudo verificar la cuenta de Google.');
  });

  it('should retain registration code and extra fields without the response envelope', () => {
    let actualError: ApiError | undefined;

    http.post('/auth/google/', { credential: 'simulated' }).subscribe({
      error: (error: ApiError) => (actualError = error),
    });
    httpTestingController.expectOne('/auth/google/').flush(
      {
        status: 'error',
        code: 'registration_required',
        errors: { detail: 'Esta cuenta de Google aún no está registrada.' },
        email: 'new.user@gmail.com',
        name: 'Ada',
        suggested_username: 'new.user',
      },
      { status: 404, statusText: 'Not Found' },
    );

    expect(actualError?.code).toBe('registration_required');
    expect(actualError?.message).toBe('Esta cuenta de Google aún no está registrada.');
    expect(actualError?.data).toEqual({
      code: 'registration_required',
      email: 'new.user@gmail.com',
      name: 'Ada',
      suggested_username: 'new.user',
    });
    expect(actualError?.errors).toEqual({
      detail: 'Esta cuenta de Google aún no está registrada.',
    });
  });

  it('should surface backend details for server errors', () => {
    let actualError: ApiError | undefined;

    http.post('/auth/google/', {}).subscribe({
      error: (error: ApiError) => (actualError = error),
    });

    httpTestingController.expectOne('/auth/google/').flush(
      {
        status: 'error',
        errors: { detail: 'El acceso con Google no está configurado.' },
      },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(actualError?.message).toBe('El acceso con Google no está configurado.');
  });

  it('should preserve backend details for forbidden responses', () => {
    let actualError: ApiError | undefined;

    http.post('/alerts/1/acknowledge/', {}).subscribe({
      error: (error: ApiError) => (actualError = error),
    });

    httpTestingController.expectOne('/alerts/1/acknowledge/').flush(
      {
        status: 'error',
        errors: { detail: 'Tu cuenta no tiene permiso para gestionar alertas.' },
      },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(actualError?.message).toBe('Tu cuenta no tiene permiso para gestionar alertas.');
  });
});
