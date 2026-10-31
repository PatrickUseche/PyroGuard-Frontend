import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertsService } from '../../core/services/alerts.service';
import { AuthService } from '../../core/services/auth.service';
import { Alert } from '../../shared/models/alert.model';
import { ALERT_STATUS_LABELS } from '../../shared/models/alert-status.model';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { ApiError } from '../../shared/models/api-error.model';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { DashboardStore } from './dashboard-store';

@Component({
  selector: 'app-active-alerts',
  standalone: true,
  imports: [RiskBadge, StateMessage],
  template: `
    <section class="alerts-section" aria-labelledby="alerts-title">
      <header class="section-heading">
        <div>
          <h2 id="alerts-title">Alertas activas</h2>
          <p>Eventos que requieren seguimiento.</p>
        </div>
        <span class="count">{{ orderedAlerts().length }} alertas</span>
      </header>

      @if (orderedAlerts().length > 0) {
        <ul class="alert-list">
          @for (alert of orderedAlerts(); track alert.id) {
            <li class="alert-card" [class.fire]="alert.level === 'FIRE'">
              <div class="alert-main">
                <app-risk-badge [risk]="alert.level" />
                <div class="alert-content">
                  <div class="alert-meta">
                    <strong>{{ alert.node_id }}</strong>
                    <span class="status">{{ statusLabel(alert) }}</span>
                    <span class="occurrences">×{{ alert.occurrences }} ocurrencias</span>
                  </div>
                  <p>{{ alert.message }}</p>
                </div>
              </div>
              @if (auth.isAuthenticated() && alert.status !== 'CLOSED') {
                <div class="alert-actions">
                  @if (alert.status === 'ACTIVE') {
                    <button
                      type="button"
                      [disabled]="loadingAlertId() === alert.id"
                      (click)="acknowledge(alert)"
                    >
                      {{ loadingAlertId() === alert.id ? 'Guardando…' : 'Reconocer' }}
                    </button>
                  }
                  <button
                    type="button"
                    [disabled]="loadingAlertId() === alert.id"
                    (click)="close(alert)"
                  >
                    {{ loadingAlertId() === alert.id ? 'Guardando…' : 'Cerrar' }}
                  </button>
                </div>
              }
              <time [attr.datetime]="alert.last_seen_at" [attr.title]="formatFullDate(alert.last_seen_at)">
                {{ formatRelativeTime(alert.last_seen_at) }}
              </time>
            </li>
          }
        </ul>
      } @else if (store.loading()) {
        <div class="alert-skeleton" aria-label="Cargando alertas" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
      } @else if (store.error()) {
        <app-state-message
          kind="error"
          title="No se pudieron cargar las alertas"
          [message]="store.error() ?? ''"
        />
      } @else {
        <app-state-message
          kind="empty"
          title="No hay alertas activas"
          message="La actividad nueva aparecerá aquí."
        />
      }
      @if (actionMessage()) {
        <p class="action-message" role="status">{{ actionMessage() }}</p>
      }
    </section>
  `,
  styles: `
    .alerts-section {
      display: grid;
      gap: var(--space-4);
    }

    .section-heading {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4);
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      font-size: 1.35rem;
    }

    .section-heading p {
      margin-top: var(--space-1);
      color: var(--color-text-muted);
    }

    .count,
    time {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .alert-actions {
      display: flex;
      gap: var(--space-2);
    }

    .alert-actions button {
      min-height: 44px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font-weight: 650;
    }

    .alert-actions button:disabled {
      cursor: wait;
      opacity: 0.6;
    }

    .action-message {
      margin: 0;
      color: var(--color-text-muted);
    }

    .alert-list {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .alert-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-left: 4px solid var(--risk-warning-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .alert-card.fire {
      border-left-color: var(--risk-fire-border);
    }

    .alert-main {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      min-width: 0;
    }

    .alert-content {
      min-width: 0;
    }

    .alert-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-1);
    }

    .status,
    .occurrences {
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .alert-content p {
      overflow-wrap: anywhere;
    }

    .empty-state,
    .alert-skeleton {
      padding: var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-card);
      color: var(--color-text-muted);
    }

    .alert-skeleton {
      display: grid;
      gap: var(--space-3);
    }

    .alert-skeleton span {
      height: 3.5rem;
      border-radius: var(--space-2);
      background: var(--color-surface-muted);
    }

    @media (max-width: 640px) {
      .alert-card {
        align-items: flex-start;
        flex-direction: column;
      }

      .alert-actions {
        width: 100%;
      }

      .alert-actions button {
        flex: 1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveAlerts {
  readonly store = inject(DashboardStore);
  readonly auth = inject(AuthService);
  private readonly alertsService = inject(AlertsService);
  private readonly router = inject(Router);
  readonly loadingAlertId = signal<number | null>(null);
  readonly actionMessage = signal<string | null>(null);
  readonly orderedAlerts = computed(() =>
    [...this.store.alerts()].sort((first, second) => {
      const priorityDifference = Number(second.level === 'FIRE') - Number(first.level === 'FIRE');
      return (
        priorityDifference ||
        Date.parse(second.last_seen_at) - Date.parse(first.last_seen_at)
      );
    }),
  );
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;

  statusLabel(alert: Alert): string {
    return ALERT_STATUS_LABELS[alert.status];
  }

  acknowledge(alert: Alert): void {
    this.performAction(alert, 'ACKNOWLEDGED');
  }

  close(alert: Alert): void {
    if (typeof window !== 'undefined' && !window.confirm('¿Quieres cerrar esta alerta?')) {
      return;
    }
    this.performAction(alert, 'CLOSED');
  }

  private performAction(alert: Alert, status: 'ACKNOWLEDGED' | 'CLOSED'): void {
    if (this.loadingAlertId() !== null) {
      return;
    }

    const optimisticAlert: Alert = {
      ...alert,
      status,
      ...(status === 'ACKNOWLEDGED' ? { acknowledged_at: new Date().toISOString() } : {}),
      ...(status === 'CLOSED' ? { closed_at: new Date().toISOString() } : {}),
    };
    this.loadingAlertId.set(alert.id);
    this.actionMessage.set(null);
    this.store.updateAlert(optimisticAlert);

    const request =
      status === 'ACKNOWLEDGED'
        ? this.alertsService.acknowledge(alert.id)
        : this.alertsService.close(alert.id);

    request.subscribe({
      next: (updatedAlert) => {
        this.store.updateAlert(updatedAlert);
        this.loadingAlertId.set(null);
      },
      error: (error: ApiError) => {
        this.store.updateAlert(alert);
        this.loadingAlertId.set(null);

        if (error.kind === 'unauthorized') {
          this.actionMessage.set('Tu sesión expiró. Inicia sesión para continuar.');
          void this.router.navigateByUrl('/login');
          return;
        }

        if (error.kind === 'conflict') {
          this.actionMessage.set('La alerta ya cambió de estado. Se actualizó la lista.');
          this.alertsService.getActive().subscribe({
            next: (activeAlerts) => this.store.replaceAlerts(activeAlerts),
            error: () => this.actionMessage.set('La alerta ya cambió de estado. No se pudo actualizar la lista.'),
          });
          return;
        }

        this.actionMessage.set(error.message);
      },
    });
  }
}
