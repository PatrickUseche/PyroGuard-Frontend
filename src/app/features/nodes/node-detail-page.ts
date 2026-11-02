import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, map, switchMap } from 'rxjs';
import { AlertsService } from '../../core/services/alerts.service';
import { NodesService } from '../../core/services/nodes.service';
import { ConnectionBadge } from '../../shared/components/connection-badge/connection-badge';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { SimulatedBadge } from '../../shared/components/simulated-badge/simulated-badge';
import { Alert } from '../../shared/models/alert.model';
import { ApiError } from '../../shared/models/api-error.model';
import { Node } from '../../shared/models/node.model';
import { NodeStatus } from '../../shared/models/node-status.model';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { SeriesChart } from '../dashboard/series-chart';

@Component({
  selector: 'app-node-detail-page',
  standalone: true,
  imports: [ConnectionBadge, RiskBadge, RouterLink, SeriesChart, SimulatedBadge, StateMessage],
  template: `
    <a class="back-link" routerLink="/">← Volver al resumen</a>
    @if (loading()) {
      <app-state-message
        kind="loading"
        title="Cargando nodo"
        message="Consultando estado y actividad reciente."
      />
    } @else if (error()) {
      <app-state-message kind="error" title="No se pudo cargar el nodo" [message]="error() ?? ''" />
    } @else if (node(); as currentNode) {
      <section class="node-detail" aria-labelledby="node-title">
        <header class="node-header">
          <div>
            <p class="eyebrow">Detalle del nodo</p>
            <h1 id="node-title">{{ currentNode.name }}</h1>
            <p class="node-id">{{ currentNode.node_id }}</p>
            <app-simulated-badge [nodeId]="currentNode.node_id" />
          </div>
          @if (status(); as nodeStatus) {
            <div class="status-group">
              <app-connection-badge [status]="nodeStatus.connection_status" />
              <app-risk-badge
                [risk]="nodeStatus.current_risk"
                [stale]="nodeStatus.current_risk_stale"
              />
            </div>
          }
        </header>

        @if (currentNode.description) {
          <p class="description">{{ currentNode.description }}</p>
        }

        <section class="detail-grid" aria-label="Estado y actividad del nodo">
          <article class="detail-card">
            <h2>Última comunicación</h2>
            @if (status(); as nodeStatus) {
              <p [attr.title]="formatFullDate(nodeStatus.last_communication)">
                {{ formatRelativeTime(nodeStatus.last_communication) }}
              </p>
            }
          </article>
          <article class="detail-card">
            <h2>Ubicación</h2>
            <p>{{ formatCoordinates(currentNode.latitude, currentNode.longitude) }}</p>
          </article>
          <article class="detail-card">
            <h2>Fecha de registro</h2>
            <p [attr.title]="formatFullDate(currentNode.created_at)">
              {{ formatFullDate(currentNode.created_at) }}
            </p>
          </article>
          <article class="detail-card">
            <h2>Última lectura</h2>
            @if (status()?.latest_reading; as reading) {
              <p [attr.title]="formatFullDate(reading.timestamp)">
                {{ formatRelativeTime(reading.timestamp) }}
              </p>
              <dl class="reading-grid">
                <div><dt>Temperatura</dt><dd>{{ reading.temperature }} °C</dd></div>
                <div><dt>Humedad</dt><dd>{{ reading.humidity }} %</dd></div>
                <div><dt>Humo</dt><dd>{{ reading.smoke }}</dd></div>
                <div><dt>Gas</dt><dd>{{ reading.gas === null ? '—' : reading.gas }}</dd></div>
              </dl>
            } @else {
              <p>No hay lecturas recientes.</p>
            }
          </article>
          <article class="detail-card">
            <h2>Alertas activas</h2>
            @if (alerts().length > 0) {
              <ul>
                @for (alert of alerts(); track alert.id) {
                  <li>
                    <app-risk-badge [risk]="alert.level" />
                    <span>{{ alert.message }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p>No hay alertas activas para este nodo.</p>
            }
          </article>
        </section>

        <app-series-chart [nodeId]="currentNode.node_id" />
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-4);
    }

    .back-link {
      display: inline-flex;
      width: fit-content;
      min-height: 44px;
      align-items: center;
      color: var(--color-link);
      font-weight: 650;
    }

    .node-detail {
      display: grid;
      gap: var(--space-6);
    }

    .node-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .eyebrow,
    h1,
    h2,
    p {
      margin: 0;
    }

    .eyebrow,
    .node-id {
      color: var(--color-text-muted);
    }

    .eyebrow {
      margin-bottom: var(--space-2);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      font-size: clamp(1.6rem, 3vw, 2rem);
    }

    .node-id,
    .description {
      margin-top: var(--space-2);
    }

    .status-group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-4);
    }

    .detail-card {
      display: grid;
      align-content: start;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    h2 {
      font-size: 1rem;
    }

    .reading-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
      margin: 0;
    }

    .reading-grid div {
      display: grid;
      gap: var(--space-1);
    }

    dt {
      color: var(--color-text-muted);
      font-size: 0.8rem;
    }

    dd {
      margin: 0;
      font-weight: 650;
    }

    ul {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    @media (max-width: 640px) {
      .node-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly nodesService = inject(NodesService);
  private readonly alertsService = inject(AlertsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly node = signal<Node | null>(null);
  readonly status = signal<NodeStatus | null>(null);
  readonly alerts = signal<Alert[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;

  formatCoordinates(latitude: number | null, longitude: number | null): string {
    if (latitude === null || longitude === null) {
      return 'Sin ubicación registrada';
    }
    return `Latitud: ${latitude.toFixed(5)}; Longitud: ${longitude.toFixed(5)}`;
  }

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const nodeId = params.get('id');
          if (nodeId === null || nodeId.trim() === '') {
            this.loading.set(false);
            this.error.set('No se indicó el identificador del nodo.');
            return [];
          }

          this.loading.set(true);
          this.error.set(null);
          return forkJoin({
            node: this.nodesService.getById(nodeId),
            status: this.nodesService.getStatus(nodeId),
            alerts: this.alertsService.getActive(),
          }).pipe(
            map((result) => ({
              ...result,
              alerts: result.alerts.filter((alert) => alert.node_id === nodeId),
            })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (result === undefined) {
            return;
          }
          this.node.set(result.node);
          this.status.set(result.status);
          this.alerts.set(result.alerts);
          this.loading.set(false);
        },
        error: (error: ApiError) => {
          this.error.set(error.message);
          this.loading.set(false);
        },
      });
  }
}
