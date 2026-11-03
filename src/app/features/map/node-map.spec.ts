import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Node } from '../../shared/models/node.model';
import { DashboardStore } from '../dashboard/dashboard-store';
import { filterLocatedNodes, mapMarkerPresentation, markerAccessibleHtml } from './map-marker.util';
import { NodeMap } from './node-map';

describe('NodeMap', () => {
  const createNode = (
    nodeId: string,
    connectionStatus: Node['connection_status'],
    currentRisk: Node['current_risk'],
    latitude: number | null = 4,
    longitude: number | null = -74,
  ): Node => ({
    node_id: nodeId,
    name: nodeId,
    description: null,
    latitude,
    longitude,
    is_active: true,
    created_at: '2026-10-30T12:00:00Z',
    last_communication: null,
    connection_status: connectionStatus,
    current_risk: currentRisk,
  });

  it('should exclude nodes without both coordinates', () => {
    const nodes = [
      createNode('located', 'ONLINE', 'NORMAL'),
      createNode('no-latitude', 'ONLINE', 'WARNING', null, -74),
      createNode('no-longitude', 'ONLINE', 'FIRE', 4, null),
    ];

    expect(filterLocatedNodes(nodes).map((node) => node.node_id)).toEqual(['located']);
  });

  it.each([
    { status: 'ONLINE', risk: 'NORMAL', className: 'normal', label: 'Normal' },
    { status: 'ONLINE', risk: 'WARNING', className: 'warning', label: 'Advertencia' },
    { status: 'ONLINE', risk: 'FIRE', className: 'fire', label: 'Incendio' },
    { status: 'OFFLINE', risk: 'FIRE', className: 'offline', label: 'Desactualizado' },
    { status: 'UNKNOWN', risk: 'NORMAL', className: 'unknown', label: 'Sin datos' },
  ] as const)(
    'should render $label with an icon and accessible text',
    ({ status, risk, className, label }) => {
      const presentation = mapMarkerPresentation(createNode('node-1', status, risk), risk);
      const html = markerAccessibleHtml(presentation);

      expect(presentation.className).toBe(className);
      expect(html).toContain('<svg');
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain(`>${label}</span>`);
    },
  );

  it('should mark simulated nodes in the visible and accessible map label', () => {
    const presentation = mapMarkerPresentation(createNode('SIM-007', 'ONLINE', 'NORMAL'), 'NORMAL');
    const html = markerAccessibleHtml(presentation);

    expect(presentation.label).toBe('Normal · Simulado');
    expect(html).toContain('Normal · Simulado');
    expect(html).toContain('aria-label="Normal · Simulado"');
  });

  it('should show an explanatory empty state instead of an empty map', async () => {
    await TestBed.configureTestingModule({
      imports: [NodeMap],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: DashboardStore,
          useValue: {
            nodes: signal([createNode('without-location', 'UNKNOWN', null, null, null)]),
            summary: signal(null),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NodeMap);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No hay nodos con ubicación');
    expect(text).toContain('Registra coordenadas');
    expect((fixture.nativeElement as HTMLElement).querySelector('.map-host')).toBeNull();
  });

  it('should show the simulated badge in the selected node card', async () => {
    const simulatedNode = createNode('SIM-008', 'ONLINE', 'NORMAL');
    await TestBed.configureTestingModule({
      imports: [NodeMap],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: DashboardStore,
          useValue: {
            nodes: signal([simulatedNode]),
            summary: signal(null),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NodeMap);
    fixture.detectChanges();
    fixture.componentInstance.selectNode(simulatedNode.node_id);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Simulado');
  });
});
