import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthUser } from '../services/auth.service';
import { HealthService } from '../services/health.service';
import { DashboardStore } from '../../features/dashboard/dashboard-store';
import { AppLayout } from './app-layout';

@Component({ standalone: true, template: '' })
class TestPage {}

describe('AppLayout', () => {
  let currentUser: ReturnType<typeof signal<AuthUser | null>>;
  let restoring: ReturnType<typeof signal<boolean>>;
  let authError: ReturnType<typeof signal<string | null>>;
  let logout: ReturnType<typeof vi.fn>;
  let restoreSession: ReturnType<typeof vi.fn>;
  let healthCheck: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    currentUser = signal<AuthUser | null>(null);
    restoring = signal(false);
    authError = signal<string | null>(null);
    logout = vi.fn();
    restoreSession = vi.fn();
    healthCheck = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [
        provideRouter([
          { path: 'login', component: TestPage, data: { layout: 'authentication' } },
          { path: '', component: TestPage },
        ]),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: AuthService,
          useValue: { currentUser, restoring, authError, logout, restoreSession },
        },
        { provide: HealthService, useValue: { check: healthCheck } },
        { provide: DashboardStore, useValue: { lastUpdated: signal(null) } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  it('should render navigation links for the dashboard, alerts, and map', () => {
    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: false,
    });
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('.primary-nav a');
    expect(links).toHaveLength(3);
    expect(links[0].textContent).toContain('Resumen');
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[1].textContent).toContain('Alertas');
    expect(links[1].getAttribute('href')).toBe('/alertas');
    expect(links[2].textContent).toContain('Mapa');
    expect(links[2].getAttribute('href')).toBe('/mapa');
  });

  it('should restore the auth session when the layout initializes', () => {
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    expect(restoreSession).toHaveBeenCalledOnce();
  });

  it('should include the server health indicator', () => {
    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: false,
    });
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-health-indicator'),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent,
    ).toContain('Comprobando');
  });

  it('should keep the academic prototype notice in the footer', () => {
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('footer')?.textContent).toContain(
      'Prototipo académico con datos sintéticos; no es un detector certificado de incendios.',
    );
  });

  it('should show the session action based on authentication state', () => {
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    const unauthenticated = fixture.nativeElement as HTMLElement;
    expect(unauthenticated.querySelector('a.auth-button')?.textContent).toContain('Iniciar sesión');
    expect(unauthenticated.querySelector('button.auth-button')).toBeNull();

    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: true,
    });
    fixture.detectChanges();

    const authenticated = fixture.nativeElement as HTMLElement;
    expect(authenticated.querySelector('.auth-user')?.textContent).toContain('Operador');
    expect(authenticated.querySelector('button.auth-button')?.textContent).toContain(
      'Cerrar sesión',
    );
    expect(authenticated.querySelector('a.auth-button')).toBeNull();
  });

  it('should show only the brand on auth routes and keep the footer without starting health', async () => {
    const fixture = TestBed.createComponent(AppLayout);
    await router.navigateByUrl('/login');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.brand')?.textContent).toContain('PyroGuard');
    expect(element.querySelector('.primary-nav')).toBeNull();
    expect(element.querySelector('app-health-indicator')).toBeNull();
    expect(element.querySelector('a.auth-button')).toBeNull();
    expect(element.querySelector('button.auth-button')).toBeNull();
    expect(element.querySelector('footer')?.textContent).toContain(
      'Prototipo académico con datos sintéticos; no es un detector certificado de incendios.',
    );
    expect(healthCheck).not.toHaveBeenCalled();
  });

  it('should not show navigation or health polling without a session', () => {
    const fixture = TestBed.createComponent(AppLayout);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.primary-nav')).toBeNull();
    expect(element.querySelector('app-health-indicator')).toBeNull();
    expect(healthCheck).not.toHaveBeenCalled();
  });
});
