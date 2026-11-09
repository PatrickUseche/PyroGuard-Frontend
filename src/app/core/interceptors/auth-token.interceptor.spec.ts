import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthService } from '../services/auth.service';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.removeItem('pyroguard-token');
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('pyroguard-token');
  });

  it('should add the Token authorization header only to API requests', () => {
    loginViaGoogle('operator-token');

    http.get('https://api.test/api/nodes/').subscribe();
    const apiRequest = httpTestingController.expectOne('https://api.test/api/nodes/');
    expect(apiRequest.request.headers.get('Authorization')).toBe('Token operator-token');
    apiRequest.flush([]);

    http.get('https://other.test/resource').subscribe();
    const externalRequest = httpTestingController.expectOne('https://other.test/resource');
    expect(externalRequest.request.headers.has('Authorization')).toBe(false);
    externalRequest.flush({});
  });

  it('should not send credentials to a URL that only shares the API path prefix', () => {
    loginViaGoogle('operator-token');

    http.get('https://api.test/api-elsewhere/resource').subscribe();
    const unrelatedRequest = httpTestingController.expectOne(
      'https://api.test/api-elsewhere/resource',
    );
    expect(unrelatedRequest.request.headers.has('Authorization')).toBe(false);
    unrelatedRequest.flush({});
  });

  it('should clear the session after an API 401', () => {
    loginViaGoogle('expired-token');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/alertas/42?estado=activo');

    http.get('https://api.test/api/nodes/').subscribe({ error: () => undefined });
    httpTestingController
      .expectOne('https://api.test/api/nodes/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.token()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/alertas/42?estado=activo' },
    });
  });

  it('should not redirect after an /auth/me/ 401 during session restoration', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('pyroguard-token', 'expired-token');
    configureTestingModule();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authService.restoreSession();

    httpTestingController
      .expectOne('https://api.test/api/auth/me/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.token()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should not clear or redirect for a 401 from Google auth endpoints', () => {
    loginViaGoogle('valid-token');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.post('https://api.test/api/auth/google/register/', {}).subscribe({
      error: () => undefined,
    });
    httpTestingController
      .expectOne('https://api.test/api/auth/google/register/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.token()).toBe('valid-token');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should redirect concurrent 401 responses only once', () => {
    loginViaGoogle('expired-token');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.get('https://api.test/api/nodes/').subscribe({ error: () => undefined });
    http.get('https://api.test/api/alerts/').subscribe({ error: () => undefined });
    httpTestingController
      .expectOne('https://api.test/api/nodes/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpTestingController
      .expectOne('https://api.test/api/alerts/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).toHaveBeenCalledOnce();
  });

  it('should not start a redirect loop when an API 401 occurs on an auth page', () => {
    loginViaGoogle('expired-token');
    let currentUrl = '/login?returnUrl=%2Falertas';
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'url', 'get').mockImplementation(() => currentUrl);

    http.get('https://api.test/api/nodes/').subscribe({ error: () => undefined });
    httpTestingController
      .expectOne('https://api.test/api/nodes/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    currentUrl = '/registro';
    http.get('https://api.test/api/alerts/').subscribe({ error: () => undefined });
    httpTestingController
      .expectOne('https://api.test/api/alerts/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.token()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should not clear the session for a 401 from a non-API URL', () => {
    loginViaGoogle('valid-token');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.get('https://other.test/resource').subscribe({ error: () => undefined });
    httpTestingController
      .expectOne('https://other.test/resource')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.token()).toBe('valid-token');
    expect(navigate).not.toHaveBeenCalled();
  });

  function configureTestingModule(): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  }

  function loginViaGoogle(token: string): void {
    authService.loginWithGoogle('simulated-credential').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/google/').flush({
      token,
      user: {
        username: 'operator',
        email: 'operator@gmail.com',
        name: 'Operador',
        can_manage_alerts: false,
      },
    });
  }
});
