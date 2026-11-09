import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { authTokenInterceptor } from '../interceptors/auth-token.interceptor';
import { AuthService } from './auth.service';
import { ApiError } from '../../shared/models/api-error.model';

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
    let result: unknown;
    service.loginWithGoogle('google-credential').subscribe((value) => {
      completed = true;
      result = value;
    });

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
    expect(result).toEqual({ kind: 'signed-in' });
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

  it('should keep an unregistered Google identity pending in memory', () => {
    let result: unknown;
    service.loginWithGoogle('temporary-google-credential').subscribe((value) => (result = value));
    httpTestingController.expectOne('https://api.test/api/auth/google/').flush(
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

    expect(result).toEqual({ kind: 'registration-required' });
    expect(service.pendingRegistration()).toEqual({
      credential: 'temporary-google-credential',
      email: 'new.user@gmail.com',
      name: 'Ada',
      suggestedUsername: 'new.user',
    });
    expect(service.token()).toBeNull();
    expect(localStorage.getItem('pyroguard-token')).toBeNull();
    expect(localStorage.getItem('google-credential')).toBeNull();
    expect(sessionStorage.getItem('google-credential')).toBeNull();
  });

  it('should attach the first-time notice to the pending registration', () => {
    service.loginWithGoogle('temporary-google-credential').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/google/').flush(
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

    service.setPendingRegistrationNotice('Es tu primera vez con esta cuenta.');

    expect(service.pendingRegistration()?.notice).toBe('Es tu primera vez con esta cuenta.');
  });

  it('should register using the pending credential and clear it after success', () => {
    service.loginWithGoogle('temporary-google-credential').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/google/').flush(
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

    service.registerWithGoogle('ChosenName').subscribe();
    const request = httpTestingController.expectOne('https://api.test/api/auth/google/register/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      credential: 'temporary-google-credential',
      username: 'ChosenName',
    });
    request.flush({
      token: 'registered-token',
      user: {
        username: 'ChosenName',
        email: 'new.user@gmail.com',
        name: 'Ada',
        can_manage_alerts: false,
      },
    });

    expect(service.pendingRegistration()).toBeNull();
    expect(service.token()).toBe('registered-token');
    expect(service.currentUser()?.username).toBe('ChosenName');
    expect(localStorage.getItem('pyroguard-token')).toBe('registered-token');
  });

  it('should clear an expired Google credential and return a clear message', () => {
    service.loginWithGoogle('expired-google-credential').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/google/').flush(
      {
        status: 'error',
        code: 'registration_required',
        errors: { detail: 'Esta cuenta de Google aún no está registrada.' },
        email: 'new.user@gmail.com',
        name: '',
        suggested_username: 'new.user',
      },
      { status: 404, statusText: 'Not Found' },
    );

    let actualError: ApiError | undefined;
    service.registerWithGoogle('ChosenName').subscribe({
      error: (error: ApiError) => (actualError = error),
    });
    httpTestingController.expectOne('https://api.test/api/auth/google/register/').flush(
      {
        status: 'error',
        errors: { detail: 'No se pudo verificar la cuenta de Google.' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(actualError?.message).toBe(
      'La verificación de Google venció. Verifica tu cuenta otra vez.',
    );
    expect(service.pendingRegistration()).toBeNull();
  });

  it('should cancel pending registration without sending the credential', () => {
    service.loginWithGoogle('temporary-google-credential').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/google/').flush(
      {
        status: 'error',
        code: 'registration_required',
        errors: { detail: 'Esta cuenta de Google aún no está registrada.' },
        email: 'new.user@gmail.com',
        name: '',
        suggested_username: 'new.user',
      },
      { status: 404, statusText: 'Not Found' },
    );
    service.cancelRegistration();

    expect(service.pendingRegistration()).toBeNull();
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

  it('should clear pending registration when logging out', () => {
    service.loginWithGoogle('temporary-google-credential').subscribe();
    httpTestingController.expectOne('https://api.test/api/auth/google/').flush(
      {
        status: 'error',
        code: 'registration_required',
        errors: { detail: 'Esta cuenta de Google aún no está registrada.' },
        email: 'new.user@gmail.com',
        name: '',
        suggested_username: 'new.user',
      },
      { status: 404, statusText: 'Not Found' },
    );

    service.logout();

    expect(service.pendingRegistration()).toBeNull();
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
