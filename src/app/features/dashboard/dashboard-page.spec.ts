import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AlertsService } from '../../core/services/alerts.service';
import { AuthService } from '../../core/services/auth.service';
import { ReadingsService } from '../../core/services/readings.service';
import { DashboardSummary } from '../../shared/models/dashboard-summary.model';
import { DashboardStore } from './dashboard-store';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  let retryAttempt = signal(0);
  let retryAvailable = signal(false);
  let retryingConnection = signal(false);
  let requestActive = signal(false);
  let retryNow: ReturnType<typeof vi.fn>;

  const summary: DashboardSummary = {
    total_nodes: 5,
    nodes_online: 2,
    nodes_offline: 1,
    nodes_unknown: 2,
    nodes_at_risk: 1,
    active_alerts: 3,
    overall_risk: 'FIRE',
    latest_readings: [],
  };

  beforeEach(async () => {
    retryAttempt = signal(0);
    retryAvailable = signal(false);
    retryingConnection = signal(false);
    requestActive = signal(false);
    retryNow = vi.fn();
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        {
          provide: DashboardStore,
          useValue: {
            summary: signal(summary),
            nodes: signal([]),
            alerts: signal([]),
            loading: signal(false),
            slowLoading: signal(false),
            error: signal(null),
            lastUpdated: signal(new Date()),
            retryAttempt,
            retryAvailable,
            retryingConnection,
            requestActive,
            retryNow,
          },
        },
        {
          provide: ReadingsService,
          useValue: {
            getAll: () => of({ items: [], total: 0 }),
            getSeries: () => of([]),
          },
        },
        {
          provide: AuthService,
          useValue: {
            canManageAlerts: signal(false),
            currentUser: signal(null),
            restoring: signal(false),
          },
        },
        {
          provide: AlertsService,
          useValue: { acknowledge: () => of({}), close: () => of({}), getActive: () => of([]) },
        },
      ],
    }).compileComponents();
  });

  it('should render all summary metrics and global risk', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nodos totales');
    expect(text).toContain('En línea');
    expect(text).toContain('Sin conexión');
    expect(text).toContain('Sin datos');
    expect(text).toContain('Nodos en riesgo');
    expect(text).toContain('Alertas activas');
    expect(text).toContain('Incendio');
    expect(text).toContain('Categorías de riesgo');
    expect(text).toContain('condiciones que requieren atención');
    expect(text).toContain('El sistema determina un riesgo de incendio.');
  });

  it('should show the cold-start retry attempt and allow an immediate retry', () => {
    retryAttempt.set(3);
    retryAvailable.set(true);
    retryingConnection.set(true);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Reintentando conexión (intento 3 de 5)…');

    const retryButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.connection-retry button',
    );
    retryButton?.click();
    expect(retryNow).toHaveBeenCalledOnce();
  });
});
