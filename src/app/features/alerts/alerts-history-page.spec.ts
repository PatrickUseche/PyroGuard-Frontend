import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { AlertsService } from '../../core/services/alerts.service';
import { NodesService } from '../../core/services/nodes.service';
import { Alert } from '../../shared/models/alert.model';
import { AlertActionsService } from './alert-actions.service';
import { AlertsHistoryPage } from './alerts-history-page';

describe('AlertsHistoryPage', () => {
  const alert: Alert = {
    id: 8,
    node_id: 'SIM-005',
    reading_id: 3,
    level: 'FIRE',
    probability: 0.9,
    message: 'Incendio detectado',
    status: 'CLOSED',
    occurrences: 5,
    created_at: '2026-10-30T10:00:00Z',
    last_seen_at: '2026-10-30T11:00:00Z',
    acknowledged_at: '2026-10-30T10:30:00Z',
    closed_at: '2026-10-30T11:30:00Z',
  };
  const activeAlert: Alert = {
    ...alert,
    status: 'ACTIVE',
    acknowledged_at: null,
    closed_at: null,
  };
  let getPage: ReturnType<typeof vi.fn>;
  let canManageAlerts: ReturnType<typeof signal<boolean>>;
  let currentUser: ReturnType<typeof signal<AuthUser | null>>;
  let restoring: ReturnType<typeof signal<boolean>>;
  let actions: {
    acknowledge: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    loadingAlertId: ReturnType<typeof signal<number | null>>;
    actionMessage: ReturnType<typeof signal<string | null>>;
  };

  beforeEach(async () => {
    getPage = vi.fn(() => of({ items: [alert], total: 21 }));
    canManageAlerts = signal(false);
    currentUser = signal<AuthUser | null>(null);
    restoring = signal(false);
    actions = {
      acknowledge: vi.fn(),
      close: vi.fn(),
      loadingAlertId: signal<number | null>(null),
      actionMessage: signal<string | null>(null),
    };
    await TestBed.configureTestingModule({
      imports: [AlertsHistoryPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: AlertsService, useValue: { getPage } },
        { provide: NodesService, useValue: { getAll: () => of([]) } },
        { provide: AuthService, useValue: { canManageAlerts, currentUser, restoring } },
        { provide: AlertActionsService, useValue: actions },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should show closed alerts and apply filters with server pagination', () => {
    const fixture = TestBed.createComponent(AlertsHistoryPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Historial de alertas');
    expect(text).toContain('Cerrada');
    expect(text).toContain('×5 ocurrencias');
    expect(text).toContain('Prob.');
    expect(text).toContain('90');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/alertas/8"]')?.textContent,
    ).toContain('Ver detalle');
    expect(text).toContain('Simulado');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/nodos/SIM-005"]')?.textContent,
    ).toContain('SIM-005');
    expect(getPage).toHaveBeenCalledWith({ limit: 20, offset: 0 });

    const statusSelect = document.createElement('select');
    statusSelect.add(new Option('Cerrada', 'CLOSED'));
    statusSelect.value = 'CLOSED';
    const change = new Event('change');
    Object.defineProperty(change, 'target', { value: statusSelect });
    fixture.componentInstance.onStatusChange(change);

    expect(getPage).toHaveBeenLastCalledWith({
      status: 'CLOSED',
      limit: 20,
      offset: 0,
    });
  });

  it('should show alert actions only to users who can manage alerts', () => {
    canManageAlerts.set(true);
    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: true,
    });
    getPage.mockReturnValue(of({ items: [activeAlert], total: 1 }));
    const fixture = TestBed.createComponent(AlertsHistoryPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.alert-actions button')).toHaveLength(2);
    expect(element.textContent).toContain('Reconocer');
    expect(element.textContent).toContain('Cerrar');
  });

  it('should show permission guidance to signed-in non-managers', () => {
    currentUser.set({
      username: 'operator',
      email: 'operator@gmail.com',
      name: 'Operador',
      canManageAlerts: false,
    });
    getPage.mockReturnValue(of({ items: [activeAlert], total: 1 }));
    const fixture = TestBed.createComponent(AlertsHistoryPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain(
      'Tu cuenta no tiene permiso para gestionar alertas. Pídelo al administrador.',
    );
    expect(element.querySelector('.alert-actions')).toBeNull();
  });

  it('should link anonymous users to login from alert history', () => {
    const fixture = TestBed.createComponent(AlertsHistoryPage);
    fixture.detectChanges();

    expect(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')].some((link) =>
        link.getAttribute('href')?.startsWith('/login'),
      ),
    ).toBe(true);
  });
});
