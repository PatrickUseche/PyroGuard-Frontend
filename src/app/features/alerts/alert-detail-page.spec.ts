import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AlertsService } from '../../core/services/alerts.service';
import { AuthService } from '../../core/services/auth.service';
import { Alert } from '../../shared/models/alert.model';
import { AlertActionsService } from './alert-actions.service';
import { AlertDetailPage } from './alert-detail-page';

describe('AlertDetailPage', () => {
  const alert: Alert = {
    id: 8,
    node_id: 'node-1',
    reading_id: 3,
    level: 'FIRE',
    probability: 0.9,
    message: 'Incendio detectado',
    status: 'ACTIVE',
    occurrences: 5,
    created_at: '2026-10-30T10:00:00Z',
    last_seen_at: '2026-10-30T11:00:00Z',
    acknowledged_at: null,
    closed_at: null,
  };
  let getById: ReturnType<typeof vi.fn>;
  let actions: {
    acknowledge: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    loadingAlertId: ReturnType<typeof signal<number | null>>;
    actionMessage: ReturnType<typeof signal<string | null>>;
  };

  beforeEach(async () => {
    getById = vi.fn(() => of(alert));
    actions = {
      acknowledge: vi.fn(),
      close: vi.fn(),
      loadingAlertId: signal<number | null>(null),
      actionMessage: signal<string | null>(null),
    };
    await TestBed.configureTestingModule({
      imports: [AlertDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '8' })) } },
        { provide: AlertsService, useValue: { getById } },
        { provide: AlertActionsService, useValue: actions },
        { provide: AuthService, useValue: { isAuthenticated: signal(true) } },
      ],
    }).compileComponents();
  });

  it('should render all alert details and authenticated actions', () => {
    const fixture = TestBed.createComponent(AlertDetailPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(getById).toHaveBeenCalledWith(8);
    expect(text).toContain('node-1');
    expect(text).toContain('Incendio');
    expect(text).toContain('Activa');
    expect(text).toContain('90');
    expect(text).toContain('Incendio detectado');
    expect(text).toContain('×5');
    expect(text).toContain('Lectura #3');
    expect(text).toContain('Creada');
    expect(text).toContain('Última ocurrencia');
    expect(text).toContain('Reconocida');
    expect(text).toContain('Cerrada');
    expect(text).toContain('Reconocer');
    expect(text).toContain('Cerrar');
  });

  it('should show a not-found state for a 404 response', () => {
    getById.mockReturnValue(throwError(() => ({ kind: 'not-found', message: 'Missing' })));
    const fixture = TestBed.createComponent(AlertDetailPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('La alerta no existe');
  });

  it('should delegate actions to the shared action service', () => {
    const fixture = TestBed.createComponent(AlertDetailPage);
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');

    buttons[0].click();
    expect(actions.acknowledge).toHaveBeenCalledWith(
      alert,
      expect.any(Function),
      expect.any(Function),
    );

    buttons[1].click();
    expect(actions.close).toHaveBeenCalledWith(alert, expect.any(Function), expect.any(Function));
  });
});
