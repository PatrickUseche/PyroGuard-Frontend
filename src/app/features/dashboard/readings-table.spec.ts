import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReadingsService } from '../../core/services/readings.service';
import { DashboardStore } from './dashboard-store';
import { ReadingsTable } from './readings-table';

describe('ReadingsTable', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingsTable],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: DashboardStore,
          useValue: {
            nodes: signal([{ node_id: 'node-1', name: 'Nodo Bosque' }]),
          },
        },
        {
          provide: ReadingsService,
          useValue: {
            getAll: () =>
              of({
                items: [
                  {
                    node_id: 'node-1',
                    temperature: 31,
                    humidity: 22,
                    smoke: 12,
                    gas: null,
                    flame: true,
                    timestamp: '2026-10-30T12:00:00Z',
                    risk_level: null,
                    ai: {
                      status: 'UNAVAILABLE',
                      risk_level: null,
                      probability: null,
                      probabilities: {},
                      model_version: null,
                    },
                  },
                ],
                total: 1,
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('should render sensor values, unevaluated final risk, and AI unavailability reason', () => {
    const fixture = TestBed.createComponent(ReadingsTable);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nodo Bosque');
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
});
