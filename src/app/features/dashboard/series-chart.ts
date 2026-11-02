import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, startWith, switchMap, timer } from 'rxjs';
import { ReadingsService } from '../../core/services/readings.service';
import { ApiError } from '../../shared/models/api-error.model';
import { Reading } from '../../shared/models/reading.model';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { formatFullDate } from '../../shared/utils/date-format.util';
import { DashboardStore } from './dashboard-store';

type MetricKey = 'temperature' | 'humidity' | 'smoke' | 'gas';
type ChartRange = '24h' | '7d' | 'custom';

interface PlotPoint {
  x: number;
  y: number;
  value: number;
  timestamp: string;
  tooltip: string;
}

interface SeriesPlot {
  key: MetricKey;
  label: string;
  unit: string;
  minimum: number;
  maximum: number;
  points: PlotPoint[];
  coordinates: string;
}

interface TimeTick {
  x: number;
  label: string;
}

const metrics: Array<{ key: MetricKey; label: string; unit: string }> = [
  { key: 'temperature', label: 'Temperatura', unit: '°C' },
  { key: 'humidity', label: 'Humedad', unit: '%' },
  { key: 'smoke', label: 'Humo', unit: '' },
  { key: 'gas', label: 'Gas', unit: '' },
];

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
});

@Component({
  selector: 'app-series-chart',
  standalone: true,
  imports: [StateMessage],
  template: `
    <section class="chart-section" aria-labelledby="chart-title">
      <header class="section-heading">
        <div>
          <h2 id="chart-title">Histórico de sensores</h2>
          <p>Selecciona variables para comparar sus series en una escala temporal compartida.</p>
        </div>
        <div class="chart-filters">
          <label>
            <span>Nodo</span>
            <select [value]="selectedNode()" (change)="onNodeChange($event)">
              <option value="">Selecciona un nodo</option>
              @if (nodeId() && !store.nodes().some((node) => node.node_id === nodeId())) {
                <option [value]="nodeId()">{{ nodeId() }}</option>
              }
              @for (node of store.nodes(); track node.node_id) {
                <option [value]="node.node_id">{{ node.name }}</option>
              }
            </select>
          </label>
          <label>
            <span>Periodo</span>
            <select [value]="range()" (change)="onRangeChange($event)">
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="custom">Rango personalizado</option>
            </select>
          </label>
        </div>
      </header>

      @if (range() === 'custom') {
        <div class="custom-range">
          <label>
            <span>Desde</span>
            <input type="datetime-local" [value]="fromDate()" (input)="onFromDateChange($event)">
          </label>
          <label>
            <span>Hasta</span>
            <input type="datetime-local" [value]="toDate()" (input)="onToDateChange($event)">
          </label>
          <button type="button" (click)="applyCustomRange()">Aplicar rango</button>
          <button type="button" class="secondary-button" (click)="clearCustomRange()">Limpiar</button>
        </div>
      }
      @if (rangeError()) {
        <p class="range-error" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3 2.8 20h18.4L12 3Zm0 5.2v5.3m0 3.2v.1" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          {{ rangeError() }}
        </p>
      }
      <fieldset class="metric-filters">
        <legend>Variables visibles</legend>
        @for (metric of metricOptions; track metric.key) {
          @if (metric.key !== 'gas' || hasGasData()) {
            <label>
              <input
                type="checkbox"
                [checked]="isMetricVisible(metric.key)"
                (change)="onMetricToggle(metric.key, $event)"
              >
              {{ metric.label }}
            </label>
          }
        }
      </fieldset>

      @if (loading()) {
        <div class="chart-skeleton" aria-label="Cargando histórico" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      } @else if (error()) {
        <app-state-message kind="error" title="No se pudo cargar el histórico" [message]="error() ?? ''" />
      } @else if (!selectedNode()) {
        <app-state-message
          kind="empty"
          title="Selecciona un nodo"
          message="Elige un nodo para consultar su histórico de lecturas."
        />
      } @else if (readings().length === 0) {
        <app-state-message
          kind="empty"
          title="Sin lecturas históricas"
          message="No hay lecturas en el periodo seleccionado."
        />
      } @else {
        @if (plots().length > 0) {
          <div class="plots">
            @for (plot of plots(); track plot.key) {
              <article class="plot">
                <header>
                  <h3>{{ plot.label }}</h3>
                  <span>{{ number(plot.minimum) }}{{ plot.unit }} – {{ number(plot.maximum) }}{{ plot.unit }}</span>
                </header>
                <svg
                  viewBox="0 0 640 160"
                  role="img"
                  [attr.aria-label]="plot.label + ', serie temporal para ' + selectedNode()"
                >
                  <line x1="48" y1="24" x2="624" y2="24" class="grid-line" />
                  <line x1="48" y1="76" x2="624" y2="76" class="grid-line" />
                  <line x1="48" y1="128" x2="624" y2="128" class="grid-line" />
                  <text x="4" y="28" class="axis-label">{{ number(plot.maximum) }}</text>
                  <text x="4" y="132" class="axis-label">{{ number(plot.minimum) }}</text>
                  <polyline [attr.points]="plot.coordinates" class="series-line" />
                  @for (point of plot.points; track point.timestamp) {
                    <circle [attr.cx]="point.x" [attr.cy]="point.y" r="3" class="series-point">
                      <title>{{ point.tooltip }}</title>
                    </circle>
                  }
                  @if (isLastPlot(plot)) {
                    @for (tick of timeTicks(); track tick.x) {
                      <text [attr.x]="tick.x" y="153" text-anchor="middle" class="axis-label">
                        {{ tick.label }}
                      </text>
                    }
                  }
                </svg>
              </article>
            }
          </div>
        } @else {
          <app-state-message
            kind="empty"
            title="No hay variables seleccionadas"
            message="Activa al menos una variable para mostrar su serie."
          />
        }

        <details class="data-details">
          <summary>Ver datos como tabla accesible</summary>
          <div class="data-scroll">
            <table>
              <caption>Lecturas históricas de {{ selectedNode() }}</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Temperatura (°C)</th>
                  <th scope="col">Humedad (%)</th>
                  <th scope="col">Humo</th>
                  <th scope="col">Gas</th>
                </tr>
              </thead>
              <tbody>
                @for (reading of readings(); track reading.timestamp) {
                  <tr>
                    <td [attr.title]="formatFullDate(reading.timestamp)">{{ reading.timestamp }}</td>
                    <td>{{ reading.temperature }}</td>
                    <td>{{ reading.humidity }}</td>
                    <td>{{ reading.smoke }}</td>
                    <td>{{ reading.gas === null ? '—' : reading.gas }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </details>
      }
    </section>
  `,
  styles: `
    .chart-section {
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

    .chart-filters {
      display: flex;
      gap: var(--space-3);
    }

    .custom-range,
    .metric-filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-3);
    }

    .custom-range label {
      min-width: min(220px, 100%);
    }

    label {
      display: grid;
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

    select {
      max-width: 220px;
    }

    button {
      cursor: pointer;
      font-weight: 650;
    }

    .secondary-button {
      background: var(--color-surface);
      color: var(--color-text);
    }

    .metric-filters {
      justify-content: flex-start;
      margin: 0;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--space-2);
    }

    .metric-filters legend {
      padding: 0 var(--space-1);
      color: var(--color-text-muted);
      font-size: 0.85rem;
      font-weight: 650;
    }

    .metric-filters label {
      display: flex;
      min-height: 44px;
      align-items: center;
      gap: var(--space-2);
    }

    .metric-filters input {
      width: 20px;
      height: 20px;
    }

    .range-error {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--risk-fire-text);
    }

    .range-error svg {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
    }

    .plots {
      display: grid;
      gap: var(--space-3);
    }

    .plot {
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .plot header {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .plot h3 {
      color: var(--color-text);
      font-size: 0.95rem;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
      margin-top: var(--space-2);
      overflow: visible;
    }

    .grid-line {
      stroke: var(--color-border);
      stroke-dasharray: 3 4;
      stroke-width: 1;
    }

    .series-line {
      fill: none;
      stroke: var(--color-focus);
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2.5;
    }

    .series-point {
      fill: var(--color-surface);
      stroke: var(--color-focus);
      stroke-width: 2;
    }

    .axis-label {
      fill: var(--color-text-muted);
      font-size: 10px;
    }

    .data-details {
      color: var(--color-text);
    }

    summary {
      width: fit-content;
      color: var(--color-link);
      cursor: pointer;
      font-weight: 650;
    }

    .data-scroll {
      max-height: 320px;
      overflow: auto;
      margin-top: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-surface);
      text-align: left;
    }

    caption,
    th,
    td {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    caption {
      text-align: left;
    }

    th {
      position: sticky;
      top: 0;
      background: var(--color-surface-muted);
    }

    .chart-state,
    .chart-skeleton {
      padding: var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-card);
      color: var(--color-text-muted);
    }

    .chart-skeleton {
      display: grid;
      gap: var(--space-3);
    }

    .chart-skeleton span {
      height: 7rem;
      border-radius: 8px;
      background: var(--color-surface-muted);
    }

    @media (max-width: 640px) {
      .section-heading {
        align-items: stretch;
        flex-direction: column;
      }

      .chart-filters {
        flex-direction: column;
      }

      select,
      .custom-range label {
        max-width: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesChart {
  private readonly readingsService = inject(ReadingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly refreshRequests = new Subject<void>();
  readonly nodeId = input('');
  readonly store = inject(DashboardStore);
  readonly selectedNode = signal('');
  readonly range = signal<ChartRange>('24h');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly rangeError = signal<string | null>(null);
  readonly metricOptions = metrics;
  readonly visibleMetrics = signal<Set<MetricKey>>(new Set(['temperature', 'humidity', 'smoke']));
  private readonly appliedFromDate = signal('');
  private readonly appliedToDate = signal('');
  readonly readings = signal<Reading[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly formatFullDate = formatFullDate;

  readonly plots = computed(() =>
    metrics
      .filter((metric) => this.visibleMetrics().has(metric.key))
      .map((metric) => this.createPlot(metric.key, metric.label, metric.unit)),
  );
  readonly timeTicks = computed(() => {
    const validReadings = this.readings().filter((reading) => Number.isFinite(Date.parse(reading.timestamp)));
    if (validReadings.length === 0) {
      return [];
    }
    const indexes = [...new Set([0, Math.floor((validReadings.length - 1) / 2), validReadings.length - 1])];
    return indexes.map((index) => ({
      x: 48 + (validReadings.length === 1 ? 288 : (index / (validReadings.length - 1)) * 576),
      label: timeFormatter.format(new Date(validReadings[index].timestamp)),
    }));
  });

  constructor() {
    effect(() => {
      const nodeId = this.nodeId();
      if (nodeId !== '' && this.selectedNode() !== nodeId) {
        this.selectedNode.set(nodeId);
        this.refreshRequests.next();
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.refreshRequests
        .pipe(
          startWith(undefined),
          switchMap(() => {
            const nodeId = this.selectedNode();
            if (nodeId === '') {
              this.loading.set(false);
              this.readings.set([]);
              return EMPTY;
            }

            this.loading.set(true);
            this.error.set(null);
            const range = this.range();
            const request =
              range === 'custom'
                ? this.readingsService.getSeries(
                    nodeId,
                    range,
                    this.appliedFromDate() === ''
                      ? undefined
                      : toIsoDateTime(this.appliedFromDate()),
                    this.appliedToDate() === ''
                      ? undefined
                      : toIsoDateTime(this.appliedToDate()),
                  )
                : this.readingsService.getSeries(nodeId, range);
            return request.pipe(
              catchError((error: unknown) => {
                this.error.set(apiErrorMessage(error));
                this.loading.set(false);
                return EMPTY;
              }),
            );
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe((readings) => {
          this.readings.set(readings);
          this.loading.set(false);
        });

      timer(30_000, 30_000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.selectedNode() !== '') {
            this.refreshRequests.next();
          }
        });
    }
  }

  onNodeChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.selectedNode.set(target.value);
    this.refreshRequests.next();
  }

  onRangeChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    const value = target.value;
    if (value === '24h' || value === '7d' || value === 'custom') {
      this.range.set(value);
      this.rangeError.set(null);
      if (this.selectedNode() !== '' && value !== 'custom') {
        this.refreshRequests.next();
      }
    }
  }

  onFromDateChange(event: Event): void {
    this.fromDate.set(inputValue(event));
    this.rangeError.set(null);
  }

  onToDateChange(event: Event): void {
    this.toDate.set(inputValue(event));
    this.rangeError.set(null);
  }

  applyCustomRange(): void {
    const from = dateTimestamp(this.fromDate());
    const to = dateTimestamp(this.toDate());
    if (
      (this.fromDate() !== '' && from === null) ||
      (this.toDate() !== '' && to === null) ||
      (from === null && to === null)
    ) {
      this.rangeError.set('Indica al menos una fecha válida para el rango.');
      return;
    }
    if (from !== null && to !== null && from > to) {
      this.rangeError.set('La fecha Desde debe ser anterior o igual a Hasta.');
      return;
    }

    this.rangeError.set(null);
    this.appliedFromDate.set(this.fromDate());
    this.appliedToDate.set(this.toDate());
    if (this.selectedNode() !== '') {
      this.refreshRequests.next();
    }
  }

  clearCustomRange(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.appliedFromDate.set('');
    this.appliedToDate.set('');
    this.rangeError.set(null);
    this.range.set('24h');
    if (this.selectedNode() !== '') {
      this.refreshRequests.next();
    }
  }

  onMetricToggle(metric: MetricKey, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.visibleMetrics.update((visible) => {
      const next = new Set(visible);
      if (target.checked) {
        next.add(metric);
      } else {
        next.delete(metric);
      }
      return next;
    });
  }

  isMetricVisible(metric: MetricKey): boolean {
    return this.visibleMetrics().has(metric);
  }

  hasGasData(): boolean {
    return this.readings().some((reading) => reading.gas !== null);
  }

  isLastPlot(plot: SeriesPlot): boolean {
    const visiblePlots = this.plots();
    return visiblePlots[visiblePlots.length - 1]?.key === plot.key;
  }

  number(value: number): string {
    return numberFormatter.format(value);
  }

  private createPlot(key: MetricKey, label: string, unit: string): SeriesPlot {
    const pointsData = this.readings()
      .filter((reading) => Number.isFinite(Date.parse(reading.timestamp)))
      .map((reading) => ({ reading, value: metricValue(reading, key) }))
      .filter((point): point is { reading: Reading; value: number } => point.value !== null);
    const values = pointsData.map((point) => point.value);
    const minimum = values.length === 0 ? 0 : Math.min(...values);
    const maximum = values.length === 0 ? 0 : Math.max(...values);
    const spread = maximum - minimum || 1;

    const points = pointsData.map(({ reading, value }, index) => {
      const x = 48 + (pointsData.length === 1 ? 288 : (index / (pointsData.length - 1)) * 576);
      const y = 24 + ((maximum - value) / spread) * 104;
      const date = formatFullDate(reading.timestamp);
      return {
        x,
        y,
        value,
        timestamp: reading.timestamp,
        tooltip: `${date}: ${numberFormatter.format(value)}${unit}`,
      };
    });

    return {
      key,
      label,
      unit,
      minimum,
      maximum,
      points,
      coordinates: points.map((point) => `${point.x},${point.y}`).join(' '),
    };
  }
}

function metricValue(reading: Reading, key: MetricKey): number | null {
  return key === 'gas' ? reading.gas : reading[key];
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
  return 'No se pudo cargar el histórico de lecturas.';
}
