import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Alert } from '../../shared/models/alert.model';
import { ApiError } from '../../shared/models/api-error.model';
import { AlertsService } from '../../core/services/alerts.service';
import { DashboardStore } from '../dashboard/dashboard-store';

type AlertActionStatus = 'ACKNOWLEDGED' | 'CLOSED';

@Injectable({ providedIn: 'root' })
export class AlertActionsService {
  private readonly alertsService = inject(AlertsService);
  private readonly dashboardStore = inject(DashboardStore);
  private readonly router = inject(Router);

  readonly loadingAlertId = signal<number | null>(null);
  readonly actionMessage = signal<string | null>(null);

  acknowledge(
    alert: Alert,
    onUpdate: (updated: Alert) => void = () => undefined,
    onConflict: () => void = () => undefined,
  ): void {
    this.performAction(alert, 'ACKNOWLEDGED', onUpdate, onConflict);
  }

  close(
    alert: Alert,
    onUpdate: (updated: Alert) => void = () => undefined,
    onConflict: () => void = () => undefined,
  ): void {
    if (typeof window !== 'undefined' && !window.confirm('¿Quieres cerrar esta alerta?')) {
      return;
    }
    this.performAction(alert, 'CLOSED', onUpdate, onConflict);
  }

  private performAction(
    alert: Alert,
    status: AlertActionStatus,
    onUpdate: (updated: Alert) => void,
    onConflict: () => void,
  ): void {
    if (this.loadingAlertId() !== null) {
      return;
    }

    const optimisticAlert: Alert = {
      ...alert,
      status,
      ...(status === 'ACKNOWLEDGED' ? { acknowledged_at: new Date().toISOString() } : {}),
      ...(status === 'CLOSED' ? { closed_at: new Date().toISOString() } : {}),
    };
    this.loadingAlertId.set(alert.id);
    this.actionMessage.set(null);
    this.updateAlert(optimisticAlert, onUpdate);

    const request =
      status === 'ACKNOWLEDGED'
        ? this.alertsService.acknowledge(alert.id)
        : this.alertsService.close(alert.id);

    request.subscribe({
      next: (updatedAlert) => {
        this.updateAlert(updatedAlert, onUpdate);
        this.loadingAlertId.set(null);
      },
      error: (error: ApiError) => {
        this.updateAlert(alert, onUpdate);
        this.loadingAlertId.set(null);

        if (error.kind === 'unauthorized') {
          this.actionMessage.set('Tu sesión expiró. Inicia sesión para continuar.');
          void this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url },
          });
          return;
        }

        if (error.kind === 'conflict') {
          this.actionMessage.set('La alerta ya cambió de estado. Se actualizó la lista.');
          onConflict();
          this.alertsService.getActive().subscribe({
            next: (activeAlerts) => this.dashboardStore.replaceAlerts(activeAlerts),
            error: () =>
              this.actionMessage.set(
                'La alerta ya cambió de estado. No se pudo actualizar la lista.',
              ),
          });
          return;
        }

        this.actionMessage.set(error.message);
      },
    });
  }

  private updateAlert(alert: Alert, onUpdate: (updated: Alert) => void): void {
    this.dashboardStore.updateAlert(alert);
    onUpdate(alert);
  }
}
