import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Alert } from '../../shared/models/alert.model';
import { ALERT_STATUS_LABELS } from '../../shared/models/alert-status.model';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { formatProbability } from '../../shared/utils/probability-format.util';
import { AlertActionsService } from '../alerts/alert-actions.service';
import { DashboardStore } from './dashboard-store';

@Component({
  selector: 'app-active-alerts',
  standalone: true,
  imports: [RiskBadge, RouterLink, StateMessage],
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
                    <a [routerLink]="['/nodos', alert.node_id]">{{ alert.node_id }}</a>
                    <span class="status">{{ statusLabel(alert) }}</span>
                    <span class="occurrences">×{{ alert.occurrences }} ocurrencias</span>
                    @if (alert.probability !== null) {
                      <span>Prob. {{ formatProbability(alert.probability) }}</span>
                    }
                  </div>
                  <p>{{ alert.message }}</p>
                </div>
              </div>
              <a class="detail-link" [routerLink]="['/alertas', alert.id]">Ver detalle</a>
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
    }

    .alert-card a {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      color: var(--color-link);
      font-weight: 650;
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
  readonly actions = inject(AlertActionsService);
  readonly loadingAlertId = this.actions.loadingAlertId;
  readonly actionMessage = this.actions.actionMessage;
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
  readonly formatProbability = formatProbability;

  statusLabel(alert: Alert): string {
    return ALERT_STATUS_LABELS[alert.status];
  }

  acknowledge(alert: Alert): void {
    this.actions.acknowledge(alert);
  }

  close(alert: Alert): void {
    this.actions.close(alert);
  }
}
