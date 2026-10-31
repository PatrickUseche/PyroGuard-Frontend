import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Alert } from '../../shared/models/alert.model';
import { DashboardStore } from './dashboard-store';
import { ActiveAlerts } from './active-alerts';

describe('ActiveAlerts', () => {
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
    await TestBed.configureTestingModule({
      imports: [ActiveAlerts],
      providers: [
        {
          provide: DashboardStore,
          useValue: {
            alerts: signal(alerts),
            loading: signal(false),
          },
        },
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
    expect(cards[1].textContent).toContain('node-warning');
  });
});
