import { test, expect } from './fixtures/test';
import { getJson } from './fixtures/backend';

test('el mapa se dibuja con un marcador por nodo', async ({ operatorPage, problems }) => {
  const nodes = await getJson('/nodes/');
  const list = Array.isArray(nodes) ? nodes : nodes.results;
  await operatorPage.goto('/mapa');

  await expect(operatorPage.getByRole('heading', { name: 'Mapa de nodos' })).toBeVisible();
  await expect(operatorPage.locator('.leaflet-container')).toBeVisible();
  await expect(operatorPage.locator('.leaflet-marker-icon')).toHaveCount(list.length);
  expect(problems.failedRequests).toEqual([]);
});
