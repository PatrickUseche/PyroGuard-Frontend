import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  catchError,
  forkJoin,
  finalize,
  map,
  of,
  Subject,
  Subscription,
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

const INITIAL_RETRY_DELAYS_MS = [3_000, 6_000, 12_000, 24_000, 45_000] as const;

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
  private readonly retryAttemptState = signal(0);
  private readonly retryAvailableState = signal(false);
  private readonly retryingConnectionState = signal(false);
  private readonly requestActiveState = signal(false);
  private readonly retryRequests = new Subject<void>();
  private retryTimer: Subscription | null = null;
  private retryCount = 0;
  private retryPending = false;
  private retryExhausted = false;
  private manualRetryRequested = false;

  readonly summary = this.summaryState.asReadonly();
  readonly nodes = this.nodesState.asReadonly();
  readonly alerts = this.alertsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly slowLoading = this.slowLoadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly lastUpdated = this.lastUpdatedState.asReadonly();
  readonly retryAttempt = this.retryAttemptState.asReadonly();
  readonly retryAvailable = this.retryAvailableState.asReadonly();
  readonly retryingConnection = this.retryingConnectionState.asReadonly();
  readonly requestActive = this.requestActiveState.asReadonly();
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

  retryNow(): void {
    if (this.requestActiveState()) {
      return;
    }

    this.retryTimer?.unsubscribe();
    this.retryTimer = null;
    this.retryPending = false;
    if (this.retryExhausted) {
      this.retryCount = 0;
      this.retryAttemptState.set(0);
    }
    this.retryExhausted = false;
    this.manualRetryRequested = true;
    this.loadingState.set(true);
    this.retryingConnectionState.set(true);
    this.retryRequests.next();
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
    createVisiblePolling(10_000, () => this.pollWhenAllowed(), this.retryRequests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private pollWhenAllowed(): Observable<void> {
    const manualRetry = this.manualRetryRequested;
    this.manualRetryRequested = false;
    if (this.retryPending || (this.retryExhausted && !manualRetry)) {
      return EMPTY;
    }

    this.requestActiveState.set(true);
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
          this.clearInitialRetryState();
        } else if (
          this.lastUpdatedState() === null &&
          errors.some((response) => response.error.kind === 'network')
        ) {
          this.retryAvailableState.set(true);
          this.scheduleInitialRetry();
        } else if (this.lastUpdatedState() === null && this.retryAvailableState()) {
          this.stopInitialRetrying();
        }
        this.slowLoadingState.set(false);
        this.loadingState.set(this.retryingConnectionState());
      }),
      map(() => undefined),
      finalize(() => this.requestActiveState.set(false)),
    );
  }

  private scheduleInitialRetry(): void {
    if (this.retryCount >= INITIAL_RETRY_DELAYS_MS.length) {
      this.retryingConnectionState.set(false);
      this.retryExhausted = true;
      return;
    }

    const delay = INITIAL_RETRY_DELAYS_MS[this.retryCount];
    this.retryCount += 1;
    this.retryAttemptState.set(this.retryCount);
    this.retryingConnectionState.set(true);
    this.retryPending = true;
    this.retryTimer?.unsubscribe();
    this.retryTimer = timer(delay)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.retryPending = false;
        this.retryRequests.next();
      });
  }

  private clearInitialRetryState(): void {
    this.stopInitialRetrying();
    this.retryCount = 0;
    this.retryExhausted = false;
    this.manualRetryRequested = false;
    this.retryAttemptState.set(0);
    this.retryAvailableState.set(false);
  }

  private stopInitialRetrying(): void {
    this.retryTimer?.unsubscribe();
    this.retryTimer = null;
    this.retryPending = false;
    this.retryingConnectionState.set(false);
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
