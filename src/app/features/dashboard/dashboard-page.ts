import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { DashboardStore } from './dashboard-store';
import { NodeGrid } from './node-grid';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [NodeGrid, RiskBadge],
  template: `
    <section class="dashboard" aria-labelledby="dashboard-title">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Monitoreo forestal</p>
          <h1 id="dashboard-title">Centro de control</h1>
          <p class="intro">Estado de nodos, lecturas recientes y alertas de PyroGuard.</p>
        </div>
        @if (store.summary(); as summary) {
          <div
            class="risk-banner"
            [class.fire]="summary.overall_risk === 'FIRE'"
            aria-live="polite"
          >
            <span>Riesgo global</span>
            <app-risk-badge [risk]="summary.overall_risk" />
          </div>
        }
      </header>

      <section class="summary-section" aria-label="Resumen del sistema">
        @if (store.summary(); as summary) {
          <div class="metrics-grid">
            <article class="metric-card">
              <span class="metric-label">Nodos totales</span>
              <strong class="metric-value">{{ summary.total_nodes }}</strong>
            </article>
            <article class="metric-card online">
              <span class="metric-label">En línea</span>
              <strong class="metric-value">{{ summary.nodes_online }}</strong>
            </article>
            <article class="metric-card offline">
              <span class="metric-label">Sin conexión</span>
              <strong class="metric-value">{{ summary.nodes_offline }}</strong>
            </article>
            <article class="metric-card unknown">
              <span class="metric-label">Sin datos</span>
              <strong class="metric-value">{{ summary.nodes_unknown }}</strong>
            </article>
            <article class="metric-card at-risk">
              <span class="metric-label">Nodos en riesgo</span>
              <strong class="metric-value">{{ summary.nodes_at_risk }}</strong>
            </article>
            <article class="metric-card active-alerts">
              <span class="metric-label">Alertas activas</span>
              <strong class="metric-value">{{ summary.active_alerts }}</strong>
            </article>
          </div>
          @if (summary.total_nodes === 0) {
            <p class="empty-summary">
              No hay nodos registrados. Cuando se conecten dispositivos, su estado aparecerá aquí.
            </p>
          }
        } @else if (store.loading()) {
          <div class="metrics-grid" aria-label="Cargando resumen">
            @for (placeholder of skeletons; track placeholder) {
              <div class="metric-card skeleton" aria-hidden="true">
                <span></span>
                <strong></strong>
              </div>
            }
          </div>
        } @else if (store.error()) {
          <p class="summary-error" role="status">{{ store.error() }}</p>
        } @else {
          <p class="empty-summary">Todavía no hay datos de resumen disponibles.</p>
        }
      </section>

      <app-node-grid />
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

    .eyebrow {
      margin: 0 0 var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.7rem, 3vw, 2.25rem);
    }

    .intro {
      margin: var(--space-2) 0 0;
      color: var(--color-text-muted);
    }

    .risk-banner {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
      font-weight: 700;
    }

    .risk-banner.fire {
      border-color: var(--risk-fire-border);
      animation: fire-pulse 1.8s ease-in-out infinite;
    }

    .summary-section {
      display: grid;
      gap: var(--space-4);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-4);
    }

    .metric-card {
      display: grid;
      min-height: 120px;
      align-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-left: 4px solid var(--color-focus);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .metric-card.online {
      border-left-color: var(--risk-normal-border);
    }

    .metric-card.offline {
      border-left-color: var(--status-offline-text);
    }

    .metric-card.unknown {
      border-left-color: var(--status-unknown-text);
    }

    .metric-card.at-risk {
      border-left-color: var(--risk-warning-border);
    }

    .metric-card.active-alerts {
      border-left-color: var(--risk-fire-border);
    }

    .metric-label {
      color: var(--color-text-muted);
      font-weight: 650;
    }

    .metric-value {
      font-size: 2rem;
      line-height: 1;
    }

    .skeleton span,
    .skeleton strong {
      display: block;
      border-radius: 6px;
      background: var(--color-surface-muted);
    }

    .skeleton span {
      width: 65%;
      height: 1rem;
    }

    .skeleton strong {
      width: 30%;
      height: 2rem;
    }

    .empty-summary,
    .summary-error {
      margin: 0;
      padding: var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-card);
      color: var(--color-text-muted);
    }

    .summary-error {
      border-style: solid;
      color: var(--risk-fire-text);
    }

    @keyframes fire-pulse {
      50% {
        box-shadow: 0 0 0 4px var(--risk-fire-bg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .risk-banner.fire {
        animation: none;
      }
    }

    @media (max-width: 640px) {
      .page-heading {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly store = inject(DashboardStore);
  readonly skeletons = [1, 2, 3, 4, 5, 6];
}
