import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AlertsService } from '../../core/services/alerts.service';
import { NodesService } from '../../core/services/nodes.service';
import { ReadingsService } from '../../core/services/readings.service';
import { DashboardStore } from '../dashboard/dashboard-store';
import { NodeDetailPage } from './node-detail-page';

describe('NodeDetailPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeDetailPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'node-1' })) },
        },
        {
          provide: NodesService,
          useValue: {
            getById: () =>
              of({
                node_id: 'node-1',
                name: 'Nodo Laguna',
                description: null,
                latitude: null,
                longitude: null,
                is_active: true,
                created_at: '2026-10-30T12:00:00Z',
                last_communication: null,
                connection_status: 'OFFLINE',
                current_risk: 'WARNING',
              }),
            getStatus: () =>
              of({
                node_id: 'node-1',
                connection_status: 'OFFLINE',
                last_communication: null,
                latest_reading: null,
                current_risk: 'WARNING',
                current_risk_stale: true,
                active_alerts_count: 0,
              }),
          },
        },
        { provide: AlertsService, useValue: { getActive: () => of([]) } },
        { provide: DashboardStore, useValue: { nodes: () => [] } },
        { provide: ReadingsService, useValue: { getSeries: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('should render node connection and stale risk state', () => {
    const fixture = TestBed.createComponent(NodeDetailPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nodo Laguna');
    expect(text).toContain('Desconectado');
    expect(text).toContain('Desactualizado');
    expect(text).toContain('No hay alertas activas');
  });
});
