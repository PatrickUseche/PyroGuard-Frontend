import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardSummary } from '../../shared/models/dashboard-summary.model';
import { Node } from '../../shared/models/node.model';
import { DashboardStore } from './dashboard-store';
import { NodeGrid } from './node-grid';

describe('NodeGrid', () => {
  const nodes: Node[] = [
    {
      node_id: 'node-offline',
      name: 'Nodo Sierra',
      description: null,
      latitude: null,
      longitude: null,
      is_active: true,
      created_at: '2026-10-30T12:00:00Z',
      last_communication: '2026-10-30T11:55:00Z',
      connection_status: 'OFFLINE',
      current_risk: 'NORMAL',
    },
    {
      node_id: 'node-online',
      name: 'Nodo Conectado',
      description: null,
      latitude: null,
      longitude: null,
      is_active: true,
      created_at: '2026-10-30T12:00:00Z',
      last_communication: '2026-10-30T11:55:00Z',
      connection_status: 'ONLINE',
      current_risk: 'NORMAL',
    },
    {
      node_id: 'node-unknown',
      name: 'Nodo Sin Datos',
      description: null,
      latitude: null,
      longitude: null,
      is_active: true,
      created_at: '2026-10-30T12:00:00Z',
      last_communication: null,
      connection_status: 'UNKNOWN',
      current_risk: 'NORMAL',
    },
  ];

  const summary: DashboardSummary = {
    total_nodes: 3,
    nodes_online: 1,
    nodes_offline: 1,
    nodes_unknown: 1,
    nodes_at_risk: 0,
    active_alerts: 0,
    overall_risk: 'NORMAL',
    latest_readings: [
      {
        node_id: 'node-offline',
        temperature: 27,
        humidity: 40,
        smoke: 0,
        gas: null,
        flame: false,
        timestamp: '2026-10-30T11:55:00Z',
        risk_level: 'NORMAL',
        ai: null,
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeGrid],
      providers: [
        provideRouter([]),
        {
          provide: DashboardStore,
          useValue: {
            summary: signal(summary),
            nodes: signal(nodes),
            loading: signal(false),
          },
        },
      ],
    }).compileComponents();
  });

  it('should display an offline node with stale risk and its latest reading', () => {
    const fixture = TestBed.createComponent(NodeGrid);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.node-card');
    expect(cards[0].textContent).toContain('Nodo Sierra');
    expect(cards[0].textContent).toContain('Desconectado');
    expect(cards[0].textContent).toContain('Desactualizado');
    expect(cards[0].textContent).toContain('27 °C');
    expect(cards[1].textContent).toContain('Conectado');
    expect(cards[1].textContent).toContain('Normal');
    expect(cards[2].textContent).toContain('Nodo Sin Datos');
    expect(cards[2].textContent).toContain('Sin datos');
    expect(cards[2].textContent).not.toContain('Normal');
  });
});
