import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReadingsService } from '../../core/services/readings.service';
import { DashboardStore } from './dashboard-store';
import { SeriesChart } from './series-chart';

describe('SeriesChart', () => {
  let getSeries: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getSeries = vi.fn(() =>
      of([
        {
          node_id: 'node-1',
          temperature: 28,
          humidity: 45,
          smoke: 7,
          gas: null,
          flame: false,
          timestamp: '2026-10-30T12:00:00Z',
          risk_level: 'NORMAL' as const,
          ai: null,
        },
        {
          node_id: 'node-1',
          temperature: 30,
          humidity: 43,
          smoke: 8,
          gas: null,
          flame: false,
          timestamp: '2026-10-30T13:00:00Z',
          risk_level: 'NORMAL' as const,
          ai: null,
        },
      ]),
    );

    await TestBed.configureTestingModule({
      imports: [SeriesChart],
      providers: [
        {
          provide: DashboardStore,
          useValue: {
            nodes: signal([{ node_id: 'node-1', name: 'Nodo Valle' }]),
          },
        },
        {
          provide: ReadingsService,
          useValue: { getSeries },
        },
      ],
    }).compileComponents();
  });

  it('should request the selected node and range and render three SVG plots', () => {
    const fixture = TestBed.createComponent(SeriesChart);
    const component = fixture.componentInstance;
    const nodeSelect = document.createElement('select');
    nodeSelect.add(new Option('Nodo Valle', 'node-1'));
    nodeSelect.value = 'node-1';
    const nodeChange = new Event('change');
    nodeSelect.dispatchEvent(nodeChange);
    component.onNodeChange(nodeChange);

    const rangeSelect = document.createElement('select');
    rangeSelect.add(new Option('Últimos 7 días', '7d'));
    rangeSelect.value = '7d';
    const rangeChange = new Event('change');
    rangeSelect.dispatchEvent(rangeChange);
    component.onRangeChange(rangeChange);
    fixture.detectChanges();

    expect(getSeries).toHaveBeenLastCalledWith('node-1', '7d');
    expect(component.plots()).toHaveLength(3);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('svg[role="img"]')).toHaveLength(3);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ver datos como tabla accesible',
    );
  });
});
