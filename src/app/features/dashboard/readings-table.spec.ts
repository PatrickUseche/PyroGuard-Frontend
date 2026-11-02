import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReadingsService } from '../../core/services/readings.service';
import { DashboardStore } from './dashboard-store';
import { ReadingsTable } from './readings-table';

describe('ReadingsTable', () => {
  let getAll: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getAll = vi.fn(() =>
      of({
        items: [
          {
            node_id: 'SIM-003',
            temperature: 31,
            humidity: 22,
            smoke: 12,
            gas: null,
            flame: true,
            timestamp: '2026-10-30T12:00:00Z',
            risk_level: null,
            ai: {
              status: 'UNAVAILABLE' as const,
              risk_level: null,
              probability: null,
              probabilities: {},
              model_version: null,
            },
          },
        ],
        total: 1,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [ReadingsTable],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: DashboardStore,
          useValue: {
            nodes: signal([{ node_id: 'SIM-003', name: 'Nodo Bosque' }]),
          },
        },
        {
          provide: ReadingsService,
          useValue: { getAll },
        },
      ],
    }).compileComponents();
  });

  it('should render sensor values, unevaluated final risk, and AI unavailability reason', () => {
    const fixture = TestBed.createComponent(ReadingsTable);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nodo Bosque');
    expect(text).toContain('Simulado');
    expect(text).toContain('31 °C');
    expect(text).toContain('—');
    expect(text).toContain('Sin evaluar');
    expect(text).toContain('IA no disponible: IA sin respuesta');
    expect(text).toContain('Sí');
  });

  it('should explain every non-OK AI status without changing final risk', () => {
    const fixture = TestBed.createComponent(ReadingsTable);
    const component = fixture.componentInstance;

    expect(
      component.aiUnavailableReason({
        status: 'DISABLED',
        risk_level: null,
        probability: null,
        probabilities: {},
        model_version: null,
      }),
    ).toBe('IA desactivada');
    expect(
      component.aiUnavailableReason({
        status: 'REJECTED',
        risk_level: null,
        probability: null,
        probabilities: {},
        model_version: null,
      }),
    ).toBe('IA rechazó la lectura');
    expect(component.aiUnavailableReason(null)).toBe('sin resultado asociado');
  });

  it('should explain missing and disabled AI and flag final risk adjusted by safety rules', () => {
    getAll.mockReturnValue(
      of({
        items: [
          {
            node_id: 'node-1',
            temperature: 29,
            humidity: 35,
            smoke: 4,
            gas: 1,
            flame: false,
            timestamp: '2026-10-30T12:01:00Z',
            risk_level: 'NORMAL' as const,
            ai: null,
          },
          {
            node_id: 'node-1',
            temperature: 50,
            humidity: 10,
            smoke: 40,
            gas: 20,
            flame: true,
            timestamp: '2026-10-30T12:02:00Z',
            risk_level: 'FIRE' as const,
            ai: {
              status: 'OK' as const,
              risk_level: 'WARNING' as const,
              probability: 0.8,
              probabilities: { WARNING: 0.8 },
              model_version: 'model-v1',
            },
          },
          {
            node_id: 'node-1',
            temperature: 30,
            humidity: 30,
            smoke: 0,
            gas: null,
            flame: false,
            timestamp: '2026-10-30T12:03:00Z',
            risk_level: 'NORMAL' as const,
            ai: {
              status: 'DISABLED' as const,
              risk_level: null,
              probability: null,
              probabilities: {},
              model_version: null,
            },
          },
        ],
        total: 3,
      }),
    );

    const fixture = TestBed.createComponent(ReadingsTable);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IA no disponible: sin resultado asociado');
    expect(text).toContain('IA no disponible: IA desactivada');
    expect(text).toContain('Ajustado por reglas de seguridad');
    expect(text).toContain('Incendio');
    expect(text).toContain('Advertencia');
    expect(text).toContain('80');
    expect(text).toContain('Modelo: model-v1');
  });

  it('should apply valid date bounds as ISO 8601 and clear them on request', () => {
    const fixture = TestBed.createComponent(ReadingsTable);
    const component = fixture.componentInstance;
    component.fromDate.set('2026-10-30T10:00');
    component.toDate.set('2026-10-30T12:00');

    component.applyDateFilter();

    expect(component.filterError()).toBeNull();
    expect(getAll).toHaveBeenLastCalledWith({
      from: new Date('2026-10-30T10:00').toISOString(),
      to: new Date('2026-10-30T12:00').toISOString(),
      limit: 20,
      offset: 0,
      order: 'desc',
    });

    component.clearDateFilter();
    expect(component.fromDate()).toBe('');
    expect(component.toDate()).toBe('');
    expect(getAll).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      order: 'desc',
    });
  });

  it('should reject a start date later than the end date without requesting data', () => {
    const fixture = TestBed.createComponent(ReadingsTable);
    const component = fixture.componentInstance;
    const initialRequestCount = getAll.mock.calls.length;
    component.fromDate.set('2026-10-30T12:00');
    component.toDate.set('2026-10-30T10:00');

    component.applyDateFilter();

    expect(component.filterError()).toBe('La fecha Desde debe ser anterior o igual a Hasta.');
    expect(getAll).toHaveBeenCalledTimes(initialRequestCount);
  });

  it('should explain when the selected period has no readings', () => {
    getAll.mockReturnValue(of({ items: [], total: 0 }));
    const fixture = TestBed.createComponent(ReadingsTable);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay registros en este período.',
    );
  });
});
