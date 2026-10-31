import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../config/api-base-url.token';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('pyroguard-token');
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://api.test/api' },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('pyroguard-token');
  });

  it('should post credentials and persist the returned token', () => {
    let completed = false;
    service.login('operator', 'secret').subscribe(() => (completed = true));

    const request = httpTestingController.expectOne('https://api.test/api/auth/login/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'operator', password: 'secret' });
    request.flush({ token: 'access-token' });

    expect(completed).toBe(true);
    expect(service.token()).toBe('access-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('pyroguard-token')).toBe('access-token');
  });

  it('should remove the persisted token on logout', () => {
    localStorage.setItem('pyroguard-token', 'old-token');
    service.logout();

    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('pyroguard-token')).toBeNull();
  });
});
