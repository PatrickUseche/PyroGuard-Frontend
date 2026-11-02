import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { createVisiblePolling } from '../../core/visible-polling';
import { AlertsService } from '../../core/services/alerts.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { NodesService } from '../../core/services/nodes.service';
import { Alert } from '../../shared/models/alert.model';
import { ApiError } from '../../shared/models/api-error.model';
import { DashboardSummary } from '../../shared/models/dashboard-summary.model';
import { Node } from '../../shared/models/node.model';

type PollResponse<T> = { ok: true; value: T } | { ok: false; error: ApiError };

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly dashboardService = inject(DashboardService);
  private readonly nodesService = inject(NodesService);
  private readonly alertsService = inject(AlertsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly summaryState = signal<DashboardSummary | null>(null);
  private readonly nodesState = signal<Node[]>([]);
  private readonly alertsState = signal<Alert[]>([]);
  private readonly loadingState = signal(true);
  private readonly slowLoadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly lastUpdatedState = signal<Date | null>(null);

  readonly summary = this.summaryState.asReadonly();
  readonly nodes = this.nodesState.asReadonly();
  readonly alerts = this.alertsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly slowLoading = this.slowLoadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly lastUpdated = this.lastUpdatedState.asReadonly();
  readonly hasData = computed(
    () => this.summaryState() !== null || this.nodesState().length > 0 || this.alertsState().length > 0,
  );

  replaceAlerts(alerts: Alert[]): void {
    this.alertsState.set(alerts);
  }

  updateAlert(alert: Alert): void {
    this.alertsState.update((alerts) =>
      alerts.map((current) => (current.id === alert.id ? alert : current)),
    );
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      timer(4_000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.loadingState()) {
            this.slowLoadingState.set(true);
          }
        });
      this.startPolling();
    }
  }

  private startPolling(): void {
    createVisiblePolling(10_000, () => this.pollWhenAllowed())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private pollWhenAllowed(): Observable<void> {
    return forkJoin({
      summary: this.capture(this.dashboardService.getSummary()),
      nodes: this.capture(this.nodesService.getAll()),
      alerts: this.capture(this.alertsService.getActive()),
    }).pipe(
      tap(({ summary, nodes, alerts }) => {
        const responses = [summary, nodes, alerts];
        const errors = responses.filter((response) => !response.ok);

        if (summary.ok) {
          this.summaryState.set(summary.value);
        }
        if (nodes.ok) {
          this.nodesState.set(nodes.value);
        }
        if (alerts.ok) {
          this.alertsState.set(alerts.value);
        }

        this.errorState.set(errors.map((response) => response.error.message).join(' ') || null);
        for (const response of errors) {
          if (response.error.kind === 'throttled') {
            throw response.error;
          }
        }

        if (errors.length === 0) {
          this.lastUpdatedState.set(new Date());
        }
        this.slowLoadingState.set(false);
        this.loadingState.set(false);
      }),
      map(() => undefined),
    );
  }

  private capture<T>(request: Observable<T>): Observable<PollResponse<T>> {
    return request.pipe(
      map((value): PollResponse<T> => ({ ok: true, value })),
      catchError((error: unknown) =>
        of<PollResponse<T>>({ ok: false, error: this.toApiError(error) }),
      ),
    );
  }

  private toApiError(error: unknown): ApiError {
    if (isApiError(error)) {
      return error;
    }

    return {
      kind: 'unknown',
      message: 'No se pudo actualizar la información del dashboard.',
    };
  }
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    'message' in error &&
    typeof error.kind === 'string' &&
    typeof error.message === 'string'
  );
}
