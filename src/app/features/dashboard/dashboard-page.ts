import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { RiskScale } from '../../shared/components/risk-scale/risk-scale';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { ActiveAlerts } from './active-alerts';
import { DashboardStore } from './dashboard-store';
import { NodeGrid } from './node-grid';
import { ReadingsTable } from './readings-table';
import { SeriesChart } from './series-chart';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [ActiveAlerts, NodeGrid, ReadingsTable, RiskScale, SeriesChart, StateMessage],
  template: `
    <section class="dashboard" aria-labelledby="dashboard-title">
      <header class="page-heading">
        <div>
          <h1 id="dashboard-title">Centro de control</h1>
          <p class="intro">Estado de nodos, lecturas recientes y alertas de PyroGuard.</p>
        </div>
        <div class="heading-status">
          @if (store.lastUpdated(); as updatedAt) {
            <time
              class="updated"
              [attr.datetime]="updatedAt.toISOString()"
              [attr.title]="formatFullDate(updatedAt.toISOString())"
            >
              Actualizado {{ formatRelativeTime(updatedAt.toISOString()) }}
            </time>
          }
        </div>
      </header>

      <section class="risk-section" aria-labelledby="risk-legend-title">
        <h2 id="risk-legend-title" class="sr-only">Categorías de riesgo</h2>
        <app-risk-scale [risk]="store.summary()?.overall_risk ?? null" variant="band" />
        @if (store.summary(); as summary) {
          <p class="sr-only" aria-live="polite">
            Riesgo global:
            {{
              summary.overall_risk === 'FIRE'
                ? 'incendio'
                : summary.overall_risk === 'WARNING'
                  ? 'advertencia'
                  : 'normal'
            }}
          </p>
        }
      </section>

      @if (store.loading() && store.slowLoading() && !store.retryAvailable()) {
        <app-state-message
          kind="loading"
          title="Conectando con el servidor"
          message="La conexión puede tardar hasta un minuto si el servidor estaba en reposo."
        />
      }
      @if (store.retryAvailable()) {
        <div class="connection-retry" [attr.role]="store.retryingConnection() ? 'status' : 'alert'">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M20 7v5h-5M4 17v-5h5m8-3a7 7 0 0 0-12-2L4 8m16 8-1 1a7 7 0 0 1-12-2"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
          <div>
            @if (store.retryingConnection() && store.retryAttempt() > 0) {
              <p>Reintentando conexión (intento {{ store.retryAttempt() }} de 5)…</p>
            } @else if (store.retryingConnection()) {
              <p>Reintentando conexión…</p>
            } @else {
              <p>No se pudo establecer conexión con el servidor.</p>
            }
          </div>
          <button type="button" [disabled]="store.requestActive()" (click)="store.retryNow()">
            Reintentar ahora
          </button>
        </div>
      }

      <section class="summary-section" aria-label="Resumen del sistema">
        @if (store.summary(); as summary) {
          <dl class="stats">
            <div>
              <dt>Nodos totales</dt>
              <dd>{{ summary.total_nodes }}</dd>
            </div>
            <div>
              <dt>En línea</dt>
              <dd>{{ summary.nodes_online }}</dd>
            </div>
            <div>
              <dt>Sin conexión</dt>
              <dd>{{ summary.nodes_offline }}</dd>
            </div>
            <div>
              <dt>Sin datos</dt>
              <dd>{{ summary.nodes_unknown }}</dd>
            </div>
            <div>
              <dt>Nodos en riesgo</dt>
              <dd [class.alert]="summary.nodes_at_risk > 0">{{ summary.nodes_at_risk }}</dd>
            </div>
            <div>
              <dt>Alertas activas</dt>
              <dd [class.alert]="summary.active_alerts > 0">{{ summary.active_alerts }}</dd>
            </div>
          </dl>
          @if (summary.total_nodes === 0) {
            <app-state-message
              kind="empty"
              title="Todavía no hay nodos"
              message="Cuando se conecten dispositivos, su estado aparecerá aquí."
            />
          }
        } @else if (store.loading()) {
          <dl class="stats" aria-label="Cargando resumen">
            @for (placeholder of skeletons; track placeholder) {
              <div class="skeleton" aria-hidden="true">
                <dt></dt>
                <dd></dd>
              </div>
            }
          </dl>
        } @else if (store.error()) {
          <app-state-message
            kind="error"
            title="No se pudo cargar el resumen"
            [message]="store.error() ?? ''"
          />
        } @else {
          <app-state-message
            kind="empty"
            title="Sin datos de resumen"
            message="Todavía no hay datos disponibles para mostrar."
          />
        }
      </section>

      <app-node-grid />
      <app-active-alerts />
      <app-readings-table />
      <app-series-chart />
    </section>
  `,
  styles: `
    .dashboard {
      display: grid;
      gap: var(--space-8);
    }

    .page-heading {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-6);
    }

    h1 {
      margin: 0;
      font-size: clamp(1.7rem, 3vw, 2.25rem);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .intro {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
    }

    .heading-status {
      display: grid;
      justify-items: end;
      gap: var(--space-2);
    }

    .updated {
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .risk-section {
      padding-top: 14px;
    }

    .summary-section {
      display: grid;
      gap: var(--space-4);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      margin: 0;
      border: var(--panel-border);
      background: var(--color-surface);
    }

    .stats > div {
      display: grid;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-4);
      border-left: 1px solid var(--color-border);
    }

    .stats > div:first-child {
      border-left: 0;
    }

    .stats dt {
      color: var(--color-text-muted);
      font-size: 0.85rem;
      font-weight: 650;
    }

    .stats dd {
      margin: 0;
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.1;
    }

    .stats dd.alert {
      color: var(--risk-fire-text);
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 4px;
    }

    .skeleton dt,
    .skeleton dd {
      height: 1rem;
      background: var(--color-surface-muted);
    }

    .skeleton dt {
      width: 65%;
    }

    .skeleton dd {
      width: 30%;
      height: 2rem;
    }

    @media (max-width: 640px) {
      .page-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .heading-status {
        justify-items: start;
      }

      .stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .stats > div:nth-child(odd) {
        border-left: 0;
      }

      .stats > div:nth-child(n + 3) {
        border-top: 1px solid var(--color-border);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly store = inject(DashboardStore);
  private readonly body = inject(DOCUMENT).body;

  constructor() {
    // El riesgo global tiñe el riel del layout (ver `body[data-risk]` en styles.css).
    effect(() => {
      const risk = this.store.summary()?.overall_risk;
      if (risk === 'FIRE' || risk === 'WARNING') {
        this.body.dataset['risk'] = risk;
      } else {
        delete this.body.dataset['risk'];
      }
    });
    inject(DestroyRef).onDestroy(() => delete this.body.dataset['risk']);
  }
  readonly skeletons = [1, 2, 3, 4, 5, 6];
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;
}
