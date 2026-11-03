import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AlertsService } from '../../core/services/alerts.service';
import { NodesService } from '../../core/services/nodes.service';
import { Alert } from '../../shared/models/alert.model';
import { AlertsHistoryPage } from './alerts-history-page';

describe('AlertsHistoryPage', () => {
  const alert: Alert = {
    id: 8,
    node_id: 'SIM-005',
    reading_id: 3,
    level: 'FIRE',
    probability: 0.9,
    message: 'Incendio detectado',
    status: 'CLOSED',
    occurrences: 5,
    created_at: '2026-10-30T10:00:00Z',
    last_seen_at: '2026-10-30T11:00:00Z',
    acknowledged_at: '2026-10-30T10:30:00Z',
    closed_at: '2026-10-30T11:30:00Z',
  };
  let getPage: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getPage = vi.fn(() => of({ items: [alert], total: 21 }));
    await TestBed.configureTestingModule({
      imports: [AlertsHistoryPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: AlertsService, useValue: { getPage } },
        { provide: NodesService, useValue: { getAll: () => of([]) } },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should show closed alerts and apply filters with server pagination', () => {
    const fixture = TestBed.createComponent(AlertsHistoryPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Historial de alertas');
    expect(text).toContain('Cerrada');
    expect(text).toContain('×5 ocurrencias');
    expect(text).toContain('Prob.');
    expect(text).toContain('90');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/alertas/8"]')?.textContent,
    ).toContain('Ver detalle');
    expect(text).toContain('Simulado');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('a[href="/nodos/SIM-005"]')?.textContent,
    ).toContain('SIM-005');
    expect(getPage).toHaveBeenCalledWith({ limit: 20, offset: 0 });

    const statusSelect = document.createElement('select');
    statusSelect.add(new Option('Cerrada', 'CLOSED'));
    statusSelect.value = 'CLOSED';
    const change = new Event('change');
    Object.defineProperty(change, 'target', { value: statusSelect });
    fixture.componentInstance.onStatusChange(change);

    expect(getPage).toHaveBeenLastCalledWith({
      status: 'CLOSED',
      limit: 20,
      offset: 0,
    });
  });
});
