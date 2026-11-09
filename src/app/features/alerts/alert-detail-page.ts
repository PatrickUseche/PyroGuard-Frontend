import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { AlertsService } from '../../core/services/alerts.service';
import { AuthService } from '../../core/services/auth.service';
import { RiskBadge } from '../../shared/components/risk-badge/risk-badge';
import { StateMessage } from '../../shared/components/state-message/state-message';
import { SimulatedBadge } from '../../shared/components/simulated-badge/simulated-badge';
import { ALERT_STATUS_LABELS } from '../../shared/models/alert-status.model';
import { Alert } from '../../shared/models/alert.model';
import { formatFullDate } from '../../shared/utils/date-format.util';
import { formatProbability } from '../../shared/utils/probability-format.util';
import { AlertActionsService } from './alert-actions.service';

@Component({
  selector: 'app-alert-detail-page',
  standalone: true,
  imports: [RiskBadge, RouterLink, SimulatedBadge, StateMessage],
  template: `
    @if (loading()) {
      <app-state-message
        kind="loading"
        title="Cargando alerta"
        message="Consultando sus detalles."
      />
    } @else if (notFound()) {
      <app-state-message
        kind="empty"
        title="La alerta no existe"
        message="No se encontró una alerta con ese identificador."
      />
    } @else if (error()) {
      <app-state-message
        kind="error"
        title="No se pudo cargar la alerta"
        [message]="error() ?? ''"
      />
    } @else if (alert(); as currentAlert) {
      <a class="back-link" routerLink="/alertas">← Volver al historial</a>
      <section class="alert-detail" aria-labelledby="alert-title">
        <header class="alert-heading">
          <div>
            <p class="eyebrow">Detalle de alerta #{{ currentAlert.id }}</p>
            <h1 id="alert-title">
              <a class="node-link" [routerLink]="['/nodos', currentAlert.node_id]">{{
                currentAlert.node_id
              }}</a>
              <app-simulated-badge [nodeId]="currentAlert.node_id" />
            </h1>
          </div>
          <app-risk-badge [risk]="currentAlert.level" />
        </header>

        <dl class="detail-grid">
          <div>
            <dt>Estado</dt>
            <dd>{{ statusLabel(currentAlert) }}</dd>
          </div>
          <div>
            <dt>Probabilidad</dt>
            <dd>
              {{
                currentAlert.probability === null
                  ? 'Sin probabilidad'
                  : formatProbability(currentAlert.probability)
              }}
            </dd>
          </div>
          <div>
            <dt>Ocurrencias</dt>
            <dd>×{{ currentAlert.occurrences }}</dd>
          </div>
          <div>
            <dt>Lectura asociada</dt>
            <dd>Lectura #{{ currentAlert.reading_id }}</dd>
          </div>
          <div>
            <dt>Creada</dt>
            <dd>{{ formatDate(currentAlert.created_at) }}</dd>
          </div>
          <div>
            <dt>Última ocurrencia</dt>
            <dd>{{ formatDate(currentAlert.last_seen_at) }}</dd>
          </div>
          <div>
            <dt>Reconocida</dt>
            <dd>{{ formatDate(currentAlert.acknowledged_at) }}</dd>
          </div>
          <div>
            <dt>Cerrada</dt>
            <dd>{{ formatDate(currentAlert.closed_at) }}</dd>
          </div>
        </dl>

        <section class="message-panel" aria-labelledby="message-title">
          <h2 id="message-title">Mensaje</h2>
          <p>{{ currentAlert.message }}</p>
        </section>

        @if (auth.canManageAlerts() && currentAlert.status !== 'CLOSED') {
          <div class="actions">
            @if (currentAlert.status === 'ACTIVE') {
              <button
                type="button"
                [disabled]="actions.loadingAlertId() === currentAlert.id"
                (click)="acknowledge(currentAlert)"
              >
                {{ actions.loadingAlertId() === currentAlert.id ? 'Guardando…' : 'Reconocer' }}
              </button>
            }
            <button
              type="button"
              [disabled]="actions.loadingAlertId() === currentAlert.id"
              (click)="close(currentAlert)"
            >
              {{ actions.loadingAlertId() === currentAlert.id ? 'Guardando…' : 'Cerrar' }}
            </button>
          </div>
        }
        @if (!auth.restoring() && !auth.canManageAlerts()) {
          <p class="permission-message">
            @if (auth.currentUser()) {
              Tu cuenta no tiene permiso para gestionar alertas. Pídelo al administrador.
            } @else {
              <a routerLink="/login" [queryParams]="{ returnUrl: '/alertas/' + currentAlert.id }">
                Inicia sesión para gestionar alertas.
              </a>
            }
          </p>
        }
        @if (actions.actionMessage(); as message) {
          <p class="action-message" role="status">{{ message }}</p>
        }
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
      min-height: 44px;
      align-items: center;
      color: var(--color-link);
      font-weight: 650;
    }

    .alert-detail {
      display: grid;
      gap: var(--space-6);
      padding: var(--space-6);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
    }

    .alert-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
    }

    .eyebrow,
    h1,
    h2,
    p {
      margin: 0;
    }

    .eyebrow {
      margin-bottom: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .node-link {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      color: var(--color-link);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-4);
      margin: 0;
    }

    .detail-grid > div,
    .message-panel {
      padding: var(--space-4);
      border-radius: var(--space-2);
      background: var(--color-surface-muted);
    }

    dt {
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }

    dd {
      margin: var(--space-1) 0 0;
      overflow-wrap: anywhere;
      font-weight: 650;
    }

    .message-panel p {
      margin-top: var(--space-2);
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    button {
      min-height: 44px;
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--space-2);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font-weight: 650;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .action-message {
      color: var(--color-text-muted);
    }

    .permission-message {
      margin: 0;
      color: var(--color-text-muted);
    }

    @media (max-width: 640px) {
      .alert-detail {
        padding: var(--space-4);
      }

      .alert-heading {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly alertsService = inject(AlertsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly actions = inject(AlertActionsService);
  readonly auth = inject(AuthService);
  readonly alert = signal<Alert | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly formatProbability = formatProbability;

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = Number(params.get('id'));
          if (!Number.isSafeInteger(id) || id < 1) {
            this.notFound.set(true);
            this.loading.set(false);
            return EMPTY;
          }
          return this.fetchAlert(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((alert) => this.alert.set(alert));
  }

  statusLabel(alert: Alert): string {
    return ALERT_STATUS_LABELS[alert.status];
  }

  formatDate(value: string | null): string {
    return formatFullDate(value);
  }

  acknowledge(alert: Alert): void {
    this.actions.acknowledge(
      alert,
      (updatedAlert) => this.alert.set(updatedAlert),
      () => this.reloadAlert(alert.id),
    );
  }

  close(alert: Alert): void {
    this.actions.close(
      alert,
      (updatedAlert) => this.alert.set(updatedAlert),
      () => this.reloadAlert(alert.id),
    );
  }

  private reloadAlert(id: number): void {
    this.fetchAlert(id).subscribe((alert) => this.alert.set(alert));
  }

  private fetchAlert(id: number) {
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);
    return this.alertsService.getById(id).pipe(
      tap(() => this.loading.set(false)),
      catchError((error: unknown) => {
        this.loading.set(false);
        if (isNotFound(error)) {
          this.notFound.set(true);
        } else {
          this.error.set(errorMessage(error));
        }
        return EMPTY;
      }),
    );
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'kind' in error && error.kind === 'not-found'
  );
}

function errorMessage(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'No se pudo cargar la alerta.';
}
