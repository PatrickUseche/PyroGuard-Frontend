import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, concat, exhaustMap, fromEvent, map, merge, of, switchMap, timer } from 'rxjs';
import { HealthService } from '../services/health.service';
import { HealthStatus } from '../../shared/models/health-status.model';
import { DashboardStore } from '../../features/dashboard/dashboard-store';

type HealthDisplay = HealthStatus | 'checking' | 'recent';

@Component({
  selector: 'app-health-indicator',
  standalone: true,
  template: `
    <span
      class="health"
      [class]="displayStatus()"
      role="status"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="tooltip()"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="5" fill="currentColor" />
      </svg>
      {{ label() }}
    </span>
  `,
  styles: `
    .health {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.8rem;
      font-weight: 650;
      white-space: nowrap;
    }

    svg {
      width: 14px;
      height: 14px;
    }

    .online,
    .recent {
      color: var(--risk-normal-text);
    }

    .offline {
      color: var(--risk-fire-text);
    }

    .unknown,
    .checking {
      color: var(--status-unknown-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthIndicator {
  private readonly healthService = inject(HealthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  readonly store = inject(DashboardStore);
  private readonly health = signal<HealthStatus | 'checking'>('checking');

  readonly displayStatus = computed<HealthDisplay>(() => {
    const health = this.health();
    const lastUpdated = this.store.lastUpdated();
    const hasRecentCycle =
      lastUpdated !== null && Date.now() - lastUpdated.getTime() <= 30_000;
    if (health === 'checking') {
      return hasRecentCycle ? 'recent' : 'checking';
    }
    if (
      health === 'offline' &&
      hasRecentCycle
    ) {
      return 'recent';
    }
    return health;
  });
  readonly label = computed(() => {
    switch (this.displayStatus()) {
      case 'online':
        return 'En línea';
      case 'offline':
        return 'Sin conexión';
      case 'recent':
        return 'Disponible';
      case 'unknown':
        return 'Estado desconocido';
      case 'checking':
        return 'Comprobando';
    }
  });
  readonly ariaLabel = computed(() =>
    this.displayStatus() === 'recent'
      ? 'Disponible según el último ciclo exitoso del dashboard'
      : `Estado del servidor: ${this.label().toLowerCase()}`,
  );
  readonly tooltip = computed(() => {
    if (this.health() === 'unknown') {
      return 'El endpoint de salud no está disponible; el estado del servicio es desconocido.';
    }
    const lastUpdated = this.store.lastUpdated();
    if (this.displayStatus() === 'recent' && lastUpdated !== null) {
      return `Último ciclo exitoso del dashboard: ${lastUpdated.toLocaleString('es-CO')}`;
    }
    return 'Estado del endpoint de salud del backend.';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      merge(
        of(document.hidden),
        fromEvent(document, 'visibilitychange').pipe(map(() => document.hidden)),
      )
        .pipe(
          switchMap((hidden) =>
            hidden
              ? EMPTY
              : concat(of(0), timer(30_000, 30_000)).pipe(
                  exhaustMap(() => this.healthService.check()),
                ),
          ),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((health) => this.health.set(health));
    }
  }
}
