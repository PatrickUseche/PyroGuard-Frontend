import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AlertsService } from '../../core/services/alerts.service';
import { AuthService } from '../../core/services/auth.service';
import { Alert } from '../../shared/models/alert.model';
import { DashboardStore } from './dashboard-store';
import { ActiveAlerts } from './active-alerts';

describe('ActiveAlerts', () => {
  let storeMock: {
    alerts: ReturnType<typeof signal<Alert[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    updateAlert: ReturnType<typeof vi.fn>;
    replaceAlerts: ReturnType<typeof vi.fn>;
  };
  let authState: ReturnType<typeof signal<boolean>>;
  let alertServiceMock: {
    acknowledge: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    getActive: ReturnType<typeof vi.fn>;
  };

  const alerts: Alert[] = [
    {
      id: 1,
      node_id: 'node-warning',
      reading_id: 1,
      level: 'WARNING',
      probability: 0.7,
      message: 'Aumento de humo',
      status: 'ACTIVE',
      occurrences: 2,
      created_at: '2026-10-30T10:00:00Z',
      last_seen_at: '2026-10-30T12:00:00Z',
      acknowledged_at: null,
      closed_at: null,
    },
    {
      id: 2,
      node_id: 'node-fire',
      reading_id: 2,
      level: 'FIRE',
      probability: 0.9,
      message: 'Riesgo crítico',
      status: 'ACKNOWLEDGED',
      occurrences: 4,
      created_at: '2026-10-30T10:00:00Z',
      last_seen_at: '2026-10-30T11:00:00Z',
      acknowledged_at: '2026-10-30T10:30:00Z',
      closed_at: null,
    },
  ];

  beforeEach(async () => {
    storeMock = {
      alerts: signal(alerts),
      loading: signal(false),
      updateAlert: vi.fn(),
      replaceAlerts: vi.fn(),
    };
    authState = signal(false);
    alertServiceMock = {
      acknowledge: vi.fn((id: number) => of(alerts.find((alert) => alert.id === id)!)),
      close: vi.fn((id: number) => of(alerts.find((alert) => alert.id === id)!)),
      getActive: vi.fn(() => of(alerts)),
    };
    await TestBed.configureTestingModule({
      imports: [ActiveAlerts],
      providers: [
        { provide: DashboardStore, useValue: storeMock },
        { provide: AuthService, useValue: { isAuthenticated: authState } },
        { provide: AlertsService, useValue: alertServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should sort fire alerts first and render status and occurrence count', () => {
    const fixture = TestBed.createComponent(ActiveAlerts);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.alert-card');
    expect(cards[0].textContent).toContain('node-fire');
    expect(cards[0].textContent).toContain('Reconocida');
    expect(cards[0].textContent).toContain('×4 ocurrencias');
    expect(cards[0].textContent).toContain('Prob.');
    expect(cards[0].textContent).toContain('90');
    expect(cards[0].querySelector('a[href="/alertas/2"]')?.textContent).toContain('Ver detalle');
    expect(cards[0].querySelector('a[href="/nodos/node-fire"]')?.textContent).toContain('node-fire');
    expect(cards[1].textContent).toContain('node-warning');
    expect(cards[1].textContent).toContain('70');
  });

  it('should hide alert action buttons without an authenticated session', () => {
    const fixture = TestBed.createComponent(ActiveAlerts);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.alert-actions')).toBeNull();
  });

  it('should show alert actions when a session is active', () => {
    authState.set(true);
    const fixture = TestBed.createComponent(ActiveAlerts);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Reconocer');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cerrar');
  });

  it('should apply acknowledgement optimistically and clear per-alert loading on success', () => {
    const request = new Subject<Alert>();
    alertServiceMock.acknowledge.mockReturnValue(request);
    const fixture = TestBed.createComponent(ActiveAlerts);
    const component = fixture.componentInstance;

    component.acknowledge(alerts[0]);

    expect(storeMock.updateAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, status: 'ACKNOWLEDGED' }),
    );
    expect(component.loadingAlertId()).toBe(1);

    request.next({ ...alerts[0], status: 'ACKNOWLEDGED' });
    expect(component.loadingAlertId()).toBeNull();
  });

  it('should roll back a conflicting action and refresh the active alerts', () => {
    alertServiceMock.acknowledge.mockReturnValue(
      throwError(() => ({ kind: 'conflict', message: 'Conflict' })),
    );
    const fixture = TestBed.createComponent(ActiveAlerts);
    const component = fixture.componentInstance;

    component.acknowledge(alerts[0]);

    expect(storeMock.updateAlert).toHaveBeenNthCalledWith(2, alerts[0]);
    expect(component.actionMessage()).toContain('La alerta ya cambió de estado');
    expect(alertServiceMock.getActive).toHaveBeenCalled();
    expect(storeMock.replaceAlerts).toHaveBeenCalledWith(alerts);
  });

  it('should require confirmation before closing an alert', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = TestBed.createComponent(ActiveAlerts);

    fixture.componentInstance.close(alerts[0]);

    expect(confirm).toHaveBeenCalled();
    expect(alertServiceMock.close).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
