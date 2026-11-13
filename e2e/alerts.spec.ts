import { test, expect } from './fixtures/test';
import { AlertsPage } from './pages/alerts.page';
import { closeOpenAlerts, sendFireReading } from './fixtures/backend';

test.describe('alertas', () => {
  test('el operador reconoce una alerta nueva y queda como reconocida', async ({
    operatorPage,
    problems,
  }) => {
    // Cada proyecto (escritorio / móvil) usa su propio nodo para no pisarse en paralelo.
    const node = test.info().project.name === 'mobile' ? 'SIM-005' : 'SIM-003';
    await closeOpenAlerts(node);
    const sent = await sendFireReading(node);
    expect(sent.status).toBe(201);
    const alerts = new AlertsPage(operatorPage);
    await alerts.goto();

    const card = alerts.card(node, 'Activa');
    await expect(card).toBeVisible();
    const acknowledge = operatorPage.waitForResponse(
      (response) => /\/alerts\/\d+\/acknowledge\/?$/.test(response.url()) && response.ok(),
    );
    await card.getByRole('button', { name: 'Reconocer' }).click();
    await acknowledge;

    await expect(alerts.card(node, 'Reconocida')).toBeVisible();
    expect(problems.failedRequests).toEqual([]);
  });

  test('un usuario sin permiso ve las alertas pero no puede gestionarlas', async ({
    viewerPage,
  }) => {
    const alerts = new AlertsPage(viewerPage);
    await alerts.goto();

    await expect(alerts.permissionNotice).toBeVisible();
    await expect(viewerPage.getByRole('button', { name: 'Reconocer' })).toHaveCount(0);
  });

  test('el filtro por estado solo deja alertas de ese estado', async ({ operatorPage }) => {
    const alerts = new AlertsPage(operatorPage);
    await alerts.goto();
    const cards = operatorPage.locator('li.alert-card');
    await expect(cards.filter({ hasText: 'Activa' }).first()).toBeVisible();

    const filtered = operatorPage.waitForResponse((r) => r.url().includes('status=CLOSED'));
    await alerts.statusFilter.selectOption({ label: 'Cerrada' });
    await filtered;

    await expect(cards.filter({ hasText: 'Activa' })).toHaveCount(0);
    await expect(cards.filter({ hasText: 'Reconocida' })).toHaveCount(0);
  });
});
