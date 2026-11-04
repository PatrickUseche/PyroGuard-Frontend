import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HealthService } from '../services/health.service';
import { DashboardStore } from '../../features/dashboard/dashboard-store';
import { AppLayout } from './app-layout';

describe('AppLayout', () => {
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let logout: ReturnType<typeof vi.fn>;
  let restoreSession: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    isAuthenticated = signal(false);
    logout = vi.fn();
    restoreSession = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AppLayout],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: AuthService, useValue: { isAuthenticated, logout, restoreSession } },
        { provide: HealthService, useValue: { check: vi.fn() } },
        { provide: DashboardStore, useValue: { lastUpdated: signal(null) } },
      ],
    }).compileComponents();
  });

  it('should render navigation links for the dashboard, alerts, and map', () => {
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

    isAuthenticated.set(true);
    fixture.detectChanges();

    const authenticated = fixture.nativeElement as HTMLElement;
    expect(authenticated.querySelector('button.auth-button')?.textContent).toContain(
      'Cerrar sesión',
    );
    expect(authenticated.querySelector('a.auth-button')).toBeNull();
  });
});
