import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConnectionBadge } from '../../shared/components/connection-badge/connection-badge';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { SimulatedBadge } from '../../shared/components/simulated-badge/simulated-badge';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { formatProbability } from '../../shared/utils/probability-format.util';
import { DashboardStore } from './dashboard-store';

@Component({
  selector: 'app-node-grid',
  standalone: true,
  imports: [ConnectionBadge, RiskBadge, RouterLink, SimulatedBadge, StateMessage],
  template: `
    <section class="node-section" aria-labelledby="nodes-title">
      <header class="section-heading">
        <div>
          <h2 id="nodes-title">Nodos</h2>
          <p>Estado de conexión, riesgo y última lectura recibida.</p>
        </div>
        <span class="count">{{ store.nodes().length }} nodos</span>
      </header>

      @if (store.nodes().length > 0) {
        <div class="node-grid">
          @for (node of store.nodes(); track node.node_id) {
            <article class="node-card">
              <header class="node-heading">
                <div>
                  <h3>
                    <a [routerLink]="['/nodos', node.node_id]">{{ node.name }}</a>
                  </h3>
                  <p class="node-id">{{ node.node_id }}</p>
                  <app-simulated-badge [nodeId]="node.node_id" />
                </div>
                <app-connection-badge [status]="node.connection_status" />
              </header>

              <div class="node-risk">
                <span>Riesgo actual</span>
                @if (node.connection_status === 'UNKNOWN') {
                  <app-risk-badge [risk]="null" emptyLabel="Sin datos" />
                } @else {
                  <app-risk-badge
                    [risk]="
                      node.current_risk ??
                      latestReadingByNode().get(node.node_id)?.risk_level ??
                      null
                    "
                    [stale]="node.connection_status === 'OFFLINE'"
                  />
                }
              </div>

              <dl class="reading-details">
                <div>
                  <dt>Última comunicación</dt>
                  <dd [attr.title]="formatFullDate(node.last_communication)">
                    {{ formatRelativeTime(node.last_communication) }}
                  </dd>
                </div>
                <div>
                  <dt>Última lectura</dt>
                  <dd>
                    @if (latestReadingByNode().get(node.node_id); as reading) {
                      <span [attr.title]="formatFullDate(reading.timestamp)">
                        {{ formatRelativeTime(reading.timestamp) }}
                      </span>
                      <span class="temperature">{{ reading.temperature }} °C</span>
                    } @else {
                      Sin lecturas recientes
                    }
                  </dd>
                </div>
                <div>
                  <dt>Evaluación de IA</dt>
                  <dd>
                    @if (aiProbability(node.node_id); as probability) {
                      Prob. {{ probability }}
                    } @else {
                      <span class="ai-unavailable">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          />
                          <path
                            d="M12 11v5m0-8v.1"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-width="2"
                          />
                        </svg>
                        IA no disponible
                      </span>
                    }
                  </dd>
                </div>
              </dl>
            </article>
          }
        </div>
      } @else if (store.loading()) {
        <div class="node-grid" aria-label="Cargando nodos">
          @for (placeholder of skeletons; track placeholder) {
            <div class="node-card skeleton" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          }
        </div>
      } @else if (store.error()) {
        <app-state-message
          kind="error"
          title="No se pudieron cargar los nodos"
          [message]="store.error() ?? ''"
        />
      } @else {
        <app-state-message
          kind="empty"
          title="No hay nodos registrados"
          message="Cuando se conecten, los nodos aparecerán en este panel."
        />
      }
    </section>
  `,
  styles: `
    .node-section {
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
    h3,
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
    .node-id {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .node-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-4);
    }

    .node-card {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .node-heading,
    .node-risk,
    .reading-details dd {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .node-heading {
      align-items: flex-start;
    }

    .node-heading h3 {
      margin-bottom: var(--space-1);
      font-size: 1rem;
    }

    .node-heading h3 a {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      color: var(--color-link);
    }

    .node-id,
    .reading-details dd {
      overflow-wrap: anywhere;
    }

    .node-risk > span,
    .reading-details dt {
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .reading-details {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
    }

    .reading-details div {
      display: grid;
      gap: var(--space-1);
    }

    .reading-details dd {
      margin: 0;
      font-size: 0.875rem;
    }

    .temperature {
      color: var(--color-text-muted);
      font-weight: 650;
    }

    .ai-unavailable {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-text-muted);
    }

    .ai-unavailable svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
    }

    .skeleton span {
      display: block;
      height: 1.25rem;
      border-radius: 6px;
      background: var(--color-surface-muted);
    }

    .empty-state {
      margin: 0;
      padding: var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-card);
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeGrid {
  readonly store = inject(DashboardStore);
  readonly skeletons = [1, 2, 3];
  readonly latestReadingByNode = computed(
    () =>
      new Map(this.store.summary()?.latest_readings.map((reading) => [reading.node_id, reading])),
  );
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;

  aiProbability(nodeId: string): string | null {
    const ai = this.latestReadingByNode().get(nodeId)?.ai;
    return ai?.status === 'OK' ? formatProbability(ai.probability) : null;
  }
}
