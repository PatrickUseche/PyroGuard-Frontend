import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authTokenInterceptor } from './auth-token.interceptor';
import { AuthService } from '../services/auth.service';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.removeItem('pyroguard-token');
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('pyroguard-token');
  });

  it('should add the Token authorization header only to API requests', () => {
    localStorage.setItem('pyroguard-token', 'operator-token');
    authService = TestBed.inject(AuthService);
    authService.login('operator', 'secret').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/login/').flush({ token: 'operator-token' });

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
    authService.login('operator', 'secret').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/login/').flush({ token: 'operator-token' });

    http.get('https://api.test/api-elsewhere/resource').subscribe();
    const unrelatedRequest = httpTestingController.expectOne(
      'https://api.test/api-elsewhere/resource',
    );
    expect(unrelatedRequest.request.headers.has('Authorization')).toBe(false);
    unrelatedRequest.flush({});
  });

  it('should clear the session after an API 401', () => {
    localStorage.setItem('pyroguard-token', 'expired-token');
    const auth = TestBed.inject(AuthService);
    auth.login('operator', 'secret').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/login/').flush({ token: 'expired-token' });

    http.get('https://api.test/api/nodes/').subscribe({ error: () => undefined });
    httpTestingController
      .expectOne('https://api.test/api/nodes/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.token()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });
});
