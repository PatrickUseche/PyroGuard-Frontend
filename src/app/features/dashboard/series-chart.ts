import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
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

type MetricKey = 'temperature' | 'humidity' | 'smoke';
type ChartRange = '24h' | '7d';

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
          <p>Temperatura, humedad y humo en una escala temporal compartida.</p>
        </div>
        <div class="chart-filters">
          <label>
            <span>Nodo</span>
            <select [value]="selectedNode()" (change)="onNodeChange($event)">
              <option value="">Selecciona un nodo</option>
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
            </select>
          </label>
        </div>
      </header>

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
                @if (plot.key === 'smoke') {
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
                </tr>
              </thead>
              <tbody>
                @for (reading of readings(); track reading.timestamp) {
                  <tr>
                    <td [attr.title]="formatFullDate(reading.timestamp)">{{ reading.timestamp }}</td>
                    <td>{{ reading.temperature }}</td>
                    <td>{{ reading.humidity }}</td>
                    <td>{{ reading.smoke }}</td>
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

    label {
      display: grid;
      gap: var(--space-1);
      color: var(--color-text-muted);
      font-size: 0.85rem;
      font-weight: 650;
    }

    select {
      min-height: 40px;
      max-width: 220px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-text);
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

      select {
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
  readonly store = inject(DashboardStore);
  readonly selectedNode = signal('');
  readonly range = signal<ChartRange>('24h');
  readonly readings = signal<Reading[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly formatFullDate = formatFullDate;

  readonly plots = computed(() =>
    metrics.map((metric) => this.createPlot(metric.key, metric.label, metric.unit)),
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
            return this.readingsService.getSeries(nodeId, this.range()).pipe(
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
    if (value === '24h' || value === '7d') {
      this.range.set(value);
      if (this.selectedNode() !== '') {
        this.refreshRequests.next();
      }
    }
  }

  number(value: number): string {
    return numberFormatter.format(value);
  }

  private createPlot(key: MetricKey, label: string, unit: string): SeriesPlot {
    const readings = this.readings().filter((reading) => Number.isFinite(Date.parse(reading.timestamp)));
    const values = readings.map((reading) => reading[key]);
    const minimum = values.length === 0 ? 0 : Math.min(...values);
    const maximum = values.length === 0 ? 0 : Math.max(...values);
    const spread = maximum - minimum || 1;

    const points = readings.map((reading, index) => {
      const x = 48 + (readings.length === 1 ? 288 : (index / (readings.length - 1)) * 576);
      const y = 24 + ((maximum - reading[key]) / spread) * 104;
      const date = formatFullDate(reading.timestamp);
      return {
        x,
        y,
        value: reading[key],
        timestamp: reading.timestamp,
        tooltip: `${date}: ${numberFormatter.format(reading[key])}${unit}`,
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
