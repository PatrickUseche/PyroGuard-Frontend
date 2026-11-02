import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, startWith, switchMap } from 'rxjs';
import { AlertsService, PaginatedAlerts } from '../../core/services/alerts.service';
import { NodesService } from '../../core/services/nodes.service';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { SimulatedBadge } from '../../shared/components/simulated-badge/simulated-badge';
import { AlertStatus, ALERT_STATUS_LABELS } from '../../shared/models/alert-status.model';
import { Alert } from '../../shared/models/alert.model';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { formatProbability } from '../../shared/utils/probability-format.util';

type AlertLevelFilter = '' | 'WARNING' | 'FIRE';
type AlertStatusFilter = '' | AlertStatus;

@Component({
  selector: 'app-alerts-history-page',
  standalone: true,
  imports: [RiskBadge, RouterLink, SimulatedBadge, StateMessage],
  template: `
    <section class="history-page" aria-labelledby="history-title">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Registro de eventos</p>
          <h1 id="history-title">Historial de alertas</h1>
          <p>Consulta alertas activas, reconocidas y cerradas.</p>
        </div>
        <span>{{ total() }} alertas</span>
      </header>

      <form class="filters" aria-label="Filtros de alertas">
        <label>
          <span>Estado</span>
          <select [value]="statusFilter()" (change)="onStatusChange($event)">
            <option value="">Todos</option>
            <option value="ACTIVE">Activa</option>
            <option value="ACKNOWLEDGED">Reconocida</option>
            <option value="CLOSED">Cerrada</option>
          </select>
        </label>
        <label>
          <span>Nivel</span>
          <select [value]="levelFilter()" (change)="onLevelChange($event)">
            <option value="">Todos</option>
            <option value="WARNING">Advertencia</option>
            <option value="FIRE">Incendio</option>
          </select>
        </label>
        <label>
          <span>Nodo</span>
          <select [value]="nodeFilter()" (change)="onNodeChange($event)">
            <option value="">Todos</option>
            @for (node of nodes(); track node.node_id) {
              <option [value]="node.node_id">{{ node.name }}</option>
            }
          </select>
        </label>
      </form>

      @if (loading()) {
        <app-state-message kind="loading" title="Cargando alertas" message="Consultando el historial." />
      } @else if (error()) {
        <app-state-message kind="error" title="No se pudo cargar el historial" [message]="error() ?? ''" />
      } @else if (alerts().length === 0) {
        <app-state-message
          kind="empty"
          title="No hay alertas"
          message="No se encontraron alertas con los filtros seleccionados."
        />
      } @else {
        <ul class="alert-list">
          @for (alert of alerts(); track alert.id) {
            <li class="alert-card">
              <div class="alert-main">
                <app-risk-badge [risk]="alert.level" />
                <div>
                  <div class="alert-meta">
                    <a [routerLink]="['/nodos', alert.node_id]">{{ alert.node_id }}</a>
                    <app-simulated-badge [nodeId]="alert.node_id" />
                    <span>{{ statusLabel(alert.status) }}</span>
                    <span>×{{ alert.occurrences }} ocurrencias</span>
                    @if (alert.probability !== null) {
                      <span>Prob. {{ formatProbability(alert.probability) }}</span>
                    }
                  </div>
                  <p>{{ alert.message }}</p>
                </div>
              </div>
              <a class="detail-link" [routerLink]="['/alertas', alert.id]">Ver detalle</a>
              <time [attr.datetime]="alert.last_seen_at" [attr.title]="formatFullDate(alert.last_seen_at)">
                {{ formatRelativeTime(alert.last_seen_at) }}
              </time>
            </li>
          }
        </ul>

        <nav class="pagination" aria-label="Paginación del historial de alertas">
          <button type="button" [disabled]="offset() === 0" (click)="previousPage()">Anterior</button>
          <span>Página {{ currentPage() }}</span>
          <button type="button" [disabled]="offset() + pageSize >= total()" (click)="nextPage()">
            Siguiente
          </button>
        </nav>
      }
    </section>
  `,
  styles: `
    .history-page {
      display: grid;
      gap: var(--space-6);
    }

    .page-heading,
    .alert-card,
    .alert-main,
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .eyebrow,
    h1,
    p {
      margin: 0;
    }

    .eyebrow {
      margin-bottom: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      font-size: clamp(1.7rem, 3vw, 2.25rem);
    }

    .page-heading p:last-child {
      margin-top: var(--space-2);
      color: var(--color-text-muted);
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    label {
      display: grid;
      min-width: 180px;
      flex: 1;
      gap: var(--space-1);
      color: var(--color-text-muted);
      font-size: 0.85rem;
      font-weight: 650;
    }

    select,
    button {
      min-height: 44px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
    }

    .alert-list {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .alert-card {
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .alert-main {
      justify-content: flex-start;
      min-width: 0;
    }

    .alert-meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .alert-meta strong {
      color: var(--color-text);
    }

    .alert-main p {
      margin-top: var(--space-1);
      overflow-wrap: anywhere;
    }

    time {
      color: var(--color-text-muted);
      font-size: 0.85rem;
      white-space: nowrap;
    }

    .alert-card a {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      color: var(--color-link);
      font-weight: 650;
    }

    .pagination {
      justify-content: center;
    }

    button {
      min-width: 100px;
      cursor: pointer;
      font-weight: 650;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    @media (max-width: 640px) {
      .page-heading,
      .alert-card {
        align-items: flex-start;
        flex-direction: column;
      }

      label {
        min-width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsHistoryPage {
  private readonly alertsService = inject(AlertsService);
  private readonly nodesService = inject(NodesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterChanges = new Subject<void>();

  readonly alerts = signal<Alert[]>([]);
  readonly nodes = signal<{ node_id: string; name: string }[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly statusFilter = signal<AlertStatusFilter>('');
  readonly levelFilter = signal<AlertLevelFilter>('');
  readonly nodeFilter = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pageSize = 20;
  readonly currentPage = () => Math.floor(this.offset() / this.pageSize) + 1;
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;
  readonly formatProbability = formatProbability;

  constructor() {
    this.nodesService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (nodes) => this.nodes.set(nodes.map(({ node_id, name }) => ({ node_id, name }))),
    });

    this.filterChanges
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.loading.set(true);
          this.error.set(null);
          const status = this.statusFilter();
          const level = this.levelFilter();
          const nodeId = this.nodeFilter();
          return this.alertsService
            .getPage({
              ...(status === '' ? {} : { status }),
              ...(level === '' ? {} : { level }),
              ...(nodeId === '' ? {} : { node_id: nodeId }),
              limit: this.pageSize,
              offset: this.offset(),
            })
            .pipe(
              catchError((error: unknown) => {
                this.error.set(apiErrorMessage(error));
                this.loading.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result: PaginatedAlerts) => {
        this.alerts.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      });
  }

  onStatusChange(event: Event): void {
    const value = selectValue(event);
    if (value === '' || value === 'ACTIVE' || value === 'ACKNOWLEDGED' || value === 'CLOSED') {
      this.statusFilter.set(value);
      this.refreshFromFirstPage();
    }
  }

  onLevelChange(event: Event): void {
    const value = selectValue(event);
    if (value === '' || value === 'WARNING' || value === 'FIRE') {
      this.levelFilter.set(value);
      this.refreshFromFirstPage();
    }
  }

  onNodeChange(event: Event): void {
    this.nodeFilter.set(selectValue(event));
    this.refreshFromFirstPage();
  }

  previousPage(): void {
    if (this.offset() === 0) {
      return;
    }
    this.offset.update((offset) => Math.max(0, offset - this.pageSize));
    this.filterChanges.next();
  }

  nextPage(): void {
    if (this.offset() + this.pageSize >= this.total()) {
      return;
    }
    this.offset.update((offset) => offset + this.pageSize);
    this.filterChanges.next();
  }

  statusLabel(status: AlertStatus): string {
    return ALERT_STATUS_LABELS[status];
  }

  private refreshFromFirstPage(): void {
    this.offset.set(0);
    this.filterChanges.next();
  }
}

function selectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : '';
}

function apiErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'No se pudo cargar el historial de alertas.';
}
