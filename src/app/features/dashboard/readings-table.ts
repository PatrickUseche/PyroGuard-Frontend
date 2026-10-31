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
import { EMPTY, Subject, catchError, startWith, switchMap, timer } from 'rxjs';
import { ReadingsService, PaginatedReadings } from '../../core/services/readings.service';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { AiResult } from '../../shared/models/ai-result.model';
import { Reading } from '../../shared/models/reading.model';
import { formatFullDate, formatRelativeTime } from '../../shared/utils/date-format.util';
import { DashboardStore } from './dashboard-store';

@Component({
  selector: 'app-readings-table',
  standalone: true,
  imports: [RiskBadge, StateMessage],
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
          message="No hay lecturas para los filtros seleccionados."
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
                  <td data-label="Nodo">{{ nodeName(reading.node_id) }}</td>
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

    select,
    button {
      min-height: 40px;
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
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pageSize = 20;
  readonly currentPage = () => Math.floor(this.offset() / this.pageSize) + 1;
  readonly formatFullDate = formatFullDate;
  readonly formatRelativeTime = formatRelativeTime;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshRequests
        .pipe(
          startWith(undefined),
          switchMap(() => {
            this.loading.set(true);
            this.error.set(null);
            return this.readingsService.getAll({
              ...(this.selectedNode() === '' ? {} : { node_id: this.selectedNode() }),
              limit: this.pageSize,
              offset: this.offset(),
              order: 'desc',
            }).pipe(
              catchError((error: unknown) => {
                this.error.set(apiErrorMessage(error));
                this.loading.set(false);
                return EMPTY;
              }),
            );
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (result: PaginatedReadings) => {
            this.readings.set(result.items);
            this.total.set(result.total);
            this.loading.set(false);
          },
        });

      timer(30_000, 30_000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.refreshRequests.next());
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
    return probability === null
      ? 'Probabilidad no disponible'
      : new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 }).format(
          probability,
        );
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
