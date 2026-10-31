import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Alert } from '../../shared/models/alert.model';
import { ALERT_STATUS_LABELS } from '../../shared/models/alert-status.model';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { DashboardStore } from './dashboard-store';

@Component({
  selector: 'app-active-alerts',
  standalone: true,
  imports: [RiskBadge],
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
      } @else {
        <p class="empty-state">No hay alertas activas. La actividad nueva aparecerá aquí.</p>
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
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveAlerts {
  readonly store = inject(DashboardStore);
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
}
