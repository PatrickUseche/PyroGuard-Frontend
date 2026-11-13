import { test, expect } from './fixtures/test';
import { getJson } from './fixtures/backend';

test('el resumen del panel coincide con la API', async ({ operatorPage }) => {
  const summary = await getJson('/dashboard/summary/');
  await operatorPage.goto('/');

  const metric = (label: string) =>
    operatorPage.locator('.metrics-grid > *').filter({ hasText: label }).first();
  await expect(operatorPage.getByRole('heading', { name: 'Centro de control' })).toBeVisible();
  await expect(metric('Nodos totales')).toContainText(String(summary.total_nodes));
  await expect(metric('Alertas activas')).toContainText(String(summary.active_alerts));
});

test('lista todos los nodos y abre el detalle de uno', async ({ operatorPage, problems }) => {
  const nodes = await getJson('/nodes/');
  const list = Array.isArray(nodes) ? nodes : nodes.results;
  await operatorPage.goto('/');

  await expect(operatorPage.getByText(`${list.length} nodos`)).toBeVisible();
  await operatorPage
    .getByRole('link', { name: /SIM-001/ })
    .first()
    .click();

  await expect(operatorPage).toHaveURL(/\/nodos\/SIM-001/);
  await expect(operatorPage.getByText('SIM-001').first()).toBeVisible();
  expect(problems.failedRequests).toEqual([]);
});

test('el menú principal navega entre secciones', async ({ operatorPage }) => {
  await operatorPage.goto('/');
  const nav = operatorPage.getByRole('navigation', { name: 'Navegación principal' });

  await nav.getByRole('link', { name: 'Alertas' }).click();
  await expect(operatorPage).toHaveURL(/\/alertas$/);
  await nav.getByRole('link', { name: 'Mapa' }).click();
  await expect(operatorPage).toHaveURL(/\/mapa$/);
  await nav.getByRole('link', { name: 'Resumen' }).click();
  await expect(operatorPage).toHaveURL(/\/$/);
});

test('un nodo que no existe muestra un error en español y permite volver', async ({
  operatorPage,
}) => {
  await operatorPage.goto('/nodos/NO-EXISTE');

  await expect(operatorPage.getByText('No se pudo cargar el nodo')).toBeVisible();
  // El mensaje viene del backend: no debe quedar en inglés ("No Node matches the given query.").
  await expect(operatorPage.getByText(/matches the given query/i)).toHaveCount(0);
  await operatorPage.getByRole('link', { name: /Volver al resumen/ }).click();
  await expect(operatorPage.getByRole('heading', { name: 'Centro de control' })).toBeVisible();
});
