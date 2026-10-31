import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReadingsService } from '../../core/services/readings.service';
import { DashboardSummary } from '../../shared/models/dashboard-summary.model';
import { DashboardStore } from './dashboard-store';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
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
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
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
          },
        },
        {
          provide: ReadingsService,
          useValue: {
            getAll: () => of({ items: [], total: 0 }),
            getSeries: () => of([]),
          },
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
  });
});
