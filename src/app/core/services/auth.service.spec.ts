import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { authTokenInterceptor } from '../interceptors/auth-token.interceptor';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('pyroguard-token');
    configureTestingModule();
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('pyroguard-token');
  });

  it('should post Google credentials and persist the token and user', () => {
    let completed = false;
    service.loginWithGoogle('google-credential').subscribe(() => (completed = true));

    const request = httpTestingController.expectOne('https://api.test/api/auth/google/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ credential: 'google-credential' });
    request.flush({
      token: 'access-token',
      user: {
        username: 'operator',
        email: 'operator@gmail.com',
        name: 'Operador',
        can_manage_alerts: true,
      },
    });

    expect(completed).toBe(true);
    expect(service.token()).toBe('access-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: true,
    });
    expect(service.canManageAlerts()).toBe(true);
    expect(localStorage.getItem('pyroguard-token')).toBe('access-token');
  });

  it('should restore the user from /auth/me/ when a token is stored', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('pyroguard-token', 'stored-token');
    configureTestingModule();
    service.restoreSession();

    const request = httpTestingController.expectOne('https://api.test/api/auth/me/');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Token stored-token');
    request.flush({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      can_manage_alerts: false,
    });

    expect(service.currentUser()?.name).toBe('Operador');
    expect(service.canManageAlerts()).toBe(false);
    expect(service.restoring()).toBe(false);
  });

  it('should clear the session when restoration receives a 401', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('pyroguard-token', 'expired-token');
    configureTestingModule();
    service.restoreSession();

    httpTestingController
      .expectOne('https://api.test/api/auth/me/')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('pyroguard-token')).toBeNull();
  });

  it('should invalidate the token on the server and clear it locally', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('pyroguard-token', 'stored-token');
    configureTestingModule();
    service.logout();

    const request = httpTestingController.expectOne('https://api.test/api/auth/logout/');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Token stored-token');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('pyroguard-token')).toBeNull();
  });

  it('should clear the local token when server logout fails', () => {
    TestBed.resetTestingModule();
    localStorage.setItem('pyroguard-token', 'stored-token');
    configureTestingModule();
    service.logout();

    httpTestingController
      .expectOne('https://api.test/api/auth/logout/')
      .error(new ProgressEvent('error'));

    expect(service.token()).toBeNull();
    expect(localStorage.getItem('pyroguard-token')).toBeNull();
    expect(service.authError()).toContain('No se pudo conectar');
  });

  function configureTestingModule(): void {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([authTokenInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  }
});
