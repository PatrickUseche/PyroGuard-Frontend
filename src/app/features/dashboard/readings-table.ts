import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { createVisiblePolling } from '../../core/visible-polling';
import { ReadingsService, PaginatedReadings } from '../../core/services/readings.service';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { SimulatedBadge } from '../../shared/components/simulated-badge/simulated-badge';
import { AiResult } from '../../shared/models/ai-result.model';
import { Reading } from '../../shared/models/reading.model';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { formatProbability as formatProbabilityValue } from '../../shared/utils/probability-format.util';
import { DashboardStore } from './dashboard-store';

@Component({
  selector: 'app-readings-table',
  standalone: true,
  imports: [RiskBadge, SimulatedBadge, StateMessage],
  template: `
    <section class="readings-section" aria-labelledby="readings-title">
      <header class="section-heading">
        <div>
          <h2 id="readings-title">Lecturas recientes</h2>
          <p>Riesgo final y datos de trazabilidad del análisis de IA.</p>
        </div>
        <label class="node-filter">
          <span>Filtrar por nodo</span>
          <select [value]="selectedNode()" (change)="onNodeChange($event)">
            <option value="">Todos los nodos</option>
            @for (node of store.nodes(); track node.node_id) {
              <option [value]="node.node_id">{{ node.name }}</option>
            }
          </select>
        </label>
      </header>

      <form class="date-filters" aria-label="Filtrar lecturas por fecha" (ngSubmit)="applyDateFilter()">
        <label>
          <span>Desde</span>
          <input
            type="datetime-local"
            [value]="fromDate()"
            (input)="onFromDateChange($event)"
          >
        </label>
        <label>
          <span>Hasta</span>
          <input
            type="datetime-local"
            [value]="toDate()"
            (input)="onToDateChange($event)"
          >
        </label>
        <button type="submit">Aplicar fechas</button>
        <button type="button" class="clear-filter" (click)="clearDateFilter()">Limpiar</button>
      </form>
      @if (filterError()) {
        <p class="filter-error" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3 2.8 20h18.4L12 3Zm0 5.2v5.3m0 3.2v.1" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          {{ filterError() }}
        </p>
      }

      @if (loading()) {
        <div class="table-skeleton" aria-label="Cargando lecturas" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      } @else if (error()) {
        <app-state-message kind="error" title="No se pudieron cargar las lecturas" [message]="error() ?? ''" />
      } @else if (readings().length === 0) {
        <app-state-message
          kind="empty"
          title="Sin lecturas"
          message="No hay registros en este período."
        />
      } @else {
        <div class="table-scroll">
          <table>
            <caption>Lecturas de sensores y evaluación final de riesgo</caption>
            <thead>
              <tr>
                <th scope="col">Nodo</th>
                <th scope="col">Fecha</th>
                <th scope="col">Temp.</th>
                <th scope="col">Humedad</th>
                <th scope="col">Humo</th>
                <th scope="col">Gas</th>
                <th scope="col">Llama</th>
                <th scope="col">Riesgo final</th>
                <th scope="col">IA</th>
              </tr>
            </thead>
            <tbody>
              @for (reading of readings(); track reading.node_id + reading.timestamp) {
                <tr>
                  <td data-label="Nodo">
                    <span>{{ nodeName(reading.node_id) }}</span>
                    <app-simulated-badge [nodeId]="reading.node_id" />
                  </td>
                  <td data-label="Fecha">
                    <time [attr.datetime]="reading.timestamp" [attr.title]="formatFullDate(reading.timestamp)">
                      {{ formatRelativeTime(reading.timestamp) }}
                    </time>
                  </td>
                  <td data-label="Temp.">{{ reading.temperature }} °C</td>
                  <td data-label="Humedad">{{ reading.humidity }} %</td>
                  <td data-label="Humo">{{ reading.smoke }}</td>
                  <td data-label="Gas">{{ reading.gas === null ? '—' : reading.gas }}</td>
                  <td data-label="Llama">
                    <span class="flame-status" [class.detected]="reading.flame">
                      @if (reading.flame) {
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            d="M12.4 2.5c.6 3.5-2.9 4.7-2.9 8.1-1.1-.7-1.8-1.8-2-3.1C4.8 10 4 12.1 4 14.3a8 8 0 0 0 16 0c0-4.1-2.6-8.5-7.6-11.8Z"
                            fill="currentColor"
                          />
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
                          <path d="m8 8 8 8" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                        </svg>
                      }
                      {{ reading.flame ? 'Sí' : 'No' }}
                    </span>
                  </td>
                  <td data-label="Riesgo final">
                    <app-risk-badge [risk]="reading.risk_level" />
                  </td>
                  <td data-label="IA">
                    @if (reading.ai?.status === 'OK' && reading.ai; as ai) {
                      <div class="ai-result" [attr.title]="ai.model_version ?? 'Versión del modelo desconocida'">
                        <app-risk-badge [risk]="ai.risk_level" />
                        <span>{{ formatProbability(ai.probability) }}</span>
                        <span class="ai-model">
                          Modelo: {{ ai.model_version ?? 'Versión desconocida' }}
                        </span>
                      </div>
                      @if (reading.risk_level !== null && ai.risk_level !== null && reading.risk_level !== ai.risk_level) {
                        <span class="adjusted">Ajustado por reglas de seguridad</span>
                      }
                    } @else {
                      <span class="ai-unavailable">
                        IA no disponible: {{ aiUnavailableReason(reading.ai) }}
                      </span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <nav class="pagination" aria-label="Paginación de lecturas">
          <span>{{ total() }} lecturas</span>
          <div>
            <button type="button" [disabled]="offset() === 0" (click)="previousPage()">Anterior</button>
            <span>Página {{ currentPage() }}</span>
            <button type="button" [disabled]="offset() + pageSize >= total()" (click)="nextPage()">
              Siguiente
            </button>
          </div>
        </nav>
      }
    </section>
  `,
  styles: `
    .readings-section {
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

    .node-filter {
      display: grid;
      gap: var(--space-1);
      color: var(--color-text-muted);
      font-size: 0.85rem;
      font-weight: 650;
    }

    .date-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-3);
    }

    .date-filters label {
      display: grid;
      min-width: min(220px, 100%);
      gap: var(--space-1);
      color: var(--color-text-muted);
      font-size: 0.85rem;
      font-weight: 650;
    }

    select,
    input,
    button {
      min-height: 44px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
    }

    .table-scroll {
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    caption {
      padding: var(--space-3);
      color: var(--color-text-muted);
      text-align: left;
    }

    th,
    td {
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-border);
      vertical-align: top;
    }

    th {
      background: var(--color-surface-muted);
      font-size: 0.8rem;
      white-space: nowrap;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .flame-status,
    .ai-result {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }

    .flame-status svg {
      width: 16px;
      height: 16px;
    }

    .flame-status.detected,
    .ai-unavailable,
    .adjusted {
      color: var(--risk-fire-text);
    }

    .ai-result {
      flex-wrap: wrap;
    }

    .adjusted {
      display: block;
      margin-top: var(--space-1);
      font-size: 0.75rem;
    }

    .ai-unavailable {
      font-size: 0.8rem;
    }

    .pagination,
    .pagination > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .pagination {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    button {
      cursor: pointer;
      color: var(--color-text);
      font-weight: 650;
    }

    .clear-filter {
      background: var(--color-surface);
      color: var(--color-text);
    }

    .filter-error {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--risk-fire-text);
    }

    .filter-error svg {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .empty-state,
    .error-state,
    .table-skeleton {
      padding: var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-card);
      color: var(--color-text-muted);
    }

    .error-state {
      border-style: solid;
      color: var(--risk-fire-text);
    }

    .table-skeleton {
      display: grid;
      gap: var(--space-3);
    }

    .table-skeleton span {
      height: 2rem;
      border-radius: var(--space-1);
      background: var(--color-surface-muted);
    }

    @media (max-width: 640px) {
      .section-heading {
        align-items: stretch;
        flex-direction: column;
      }

      .table-scroll {
        overflow: visible;
        border: 0;
        background: transparent;
      }

      table,
      tbody {
        display: block;
      }

      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        clip-path: inset(50%);
      }

      tbody {
        display: grid;
        gap: var(--space-3);
      }

      tbody tr {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        background: var(--color-surface);
      }

      td {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        padding: 0;
        border: 0;
        text-align: right;
      }

      td::before {
        flex: 0 0 auto;
        color: var(--color-text-muted);
        content: attr(data-label);
        font-weight: 650;
        text-align: left;
      }

      .pagination,
      .pagination > div {
        flex-wrap: wrap;
        justify-content: center;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingsTable {
  private readonly readingsService = inject(ReadingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly refreshRequests = new Subject<void>();
  readonly store = inject(DashboardStore);
  readonly readings = signal<Reading[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly selectedNode = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  private readonly appliedFromDate = signal('');
  private readonly appliedToDate = signal('');
  readonly filterError = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pageSize = 20;
  readonly currentPage = () => Math.floor(this.offset() / this.pageSize) + 1;
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      createVisiblePolling(
        30_000,
        () => {
          this.loading.set(true);
          this.error.set(null);
          return this.readingsService.getAll({
            ...(this.selectedNode() === '' ? {} : { node_id: this.selectedNode() }),
            ...(this.appliedFromDate() === ''
              ? {}
              : { from: toIsoDateTime(this.appliedFromDate()) }),
            ...(this.appliedToDate() === ''
              ? {}
              : { to: toIsoDateTime(this.appliedToDate()) }),
            limit: this.pageSize,
            offset: this.offset(),
            order: 'desc',
          });
        },
        this.refreshRequests,
      )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((result) => {
          if (!result.ok) {
            this.error.set(apiErrorMessage(result.error));
            this.loading.set(false);
            return;
          }
          const page: PaginatedReadings = result.value;
          this.readings.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        });
    }
  }

  onNodeChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    this.selectedNode.set(target.value);
    this.offset.set(0);
    this.refreshRequests.next();
  }

  onFromDateChange(event: Event): void {
    this.fromDate.set(inputValue(event));
    this.filterError.set(null);
  }

  onToDateChange(event: Event): void {
    this.toDate.set(inputValue(event));
    this.filterError.set(null);
  }

  applyDateFilter(): void {
    const from = dateTimestamp(this.fromDate());
    const to = dateTimestamp(this.toDate());
    if ((this.fromDate() !== '' && from === null) || (this.toDate() !== '' && to === null)) {
      this.filterError.set('Ingresa fechas válidas para el período.');
      return;
    }
    if (from !== null && to !== null && from > to) {
      this.filterError.set('La fecha Desde debe ser anterior o igual a Hasta.');
      return;
    }

    this.filterError.set(null);
    this.appliedFromDate.set(this.fromDate());
    this.appliedToDate.set(this.toDate());
    this.offset.set(0);
    this.refreshRequests.next();
  }

  clearDateFilter(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.appliedFromDate.set('');
    this.appliedToDate.set('');
    this.filterError.set(null);
    this.offset.set(0);
    this.refreshRequests.next();
  }

  previousPage(): void {
    if (this.offset() === 0) {
      return;
    }
    this.offset.update((offset) => Math.max(0, offset - this.pageSize));
    this.refreshRequests.next();
  }

  nextPage(): void {
    if (this.offset() + this.pageSize >= this.total()) {
      return;
    }
    this.offset.update((offset) => offset + this.pageSize);
    this.refreshRequests.next();
  }

  nodeName(nodeId: string): string {
    return this.store.nodes().find((node) => node.node_id === nodeId)?.name ?? nodeId;
  }

  formatProbability(probability: number | null): string {
    return formatProbabilityValue(probability);
  }

  aiUnavailableReason(ai: AiResult | null): string {
    if (ai === null) {
      return 'sin resultado asociado';
    }

    switch (ai.status) {
      case 'DISABLED':
        return 'IA desactivada';
      case 'UNAVAILABLE':
        return 'IA sin respuesta';
      case 'REJECTED':
        return 'IA rechazó la lectura';
      case 'INVALID_RESPONSE':
        return 'Respuesta de IA inválida';
      case 'OK':
        return 'resultado disponible';
    }
  }

}

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function dateTimestamp(value: string): number | null {
  if (value === '') {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toIsoDateTime(value: string): string {
  const timestamp = dateTimestamp(value);
  return timestamp === null ? '' : new Date(timestamp).toISOString();
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
  return 'No se pudieron cargar las lecturas.';
}
