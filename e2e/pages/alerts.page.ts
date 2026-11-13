import type { Locator, Page } from '@playwright/test';

export class AlertsPage {
  readonly heading: Locator;
  readonly statusFilter: Locator;
  readonly levelFilter: Locator;
  readonly nodeFilter: Locator;
  readonly permissionNotice: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Historial de alertas' });
    const filters = page.getByRole('form', { name: 'Filtros de alertas' });
    this.statusFilter = filters.getByLabel('Estado');
    this.levelFilter = filters.getByLabel('Nivel');
    this.nodeFilter = filters.getByLabel('Nodo');
    this.permissionNotice = page.getByText('Tu cuenta no tiene permiso para gestionar alertas');
  }

  async goto() {
    await this.page.goto('/alertas');
    await this.heading.waitFor();
  }

  /** Tarjeta de la alerta del nodo indicado con el estado dado. */
  card(nodeId: string, status: string) {
    return this.page
      .locator('li.alert-card')
      .filter({ hasText: nodeId })
      .filter({ hasText: status })
      .first();
  }
}
