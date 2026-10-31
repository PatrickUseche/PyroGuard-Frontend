import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
  ];

  const summary: DashboardSummary = {
    total_nodes: 1,
    nodes_online: 0,
    nodes_offline: 1,
    nodes_unknown: 0,
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

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nodo Sierra');
    expect(text).toContain('Desconectado');
    expect(text).toContain('Desactualizado');
    expect(text).toContain('27 °C');
  });
});
