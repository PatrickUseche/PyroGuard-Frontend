import { test, expect } from './fixtures/test';

const ROUTES = ['/', '/mapa', '/alertas', '/nodos/SIM-001'];

for (const route of ROUTES) {
  test(`la ruta ${route} carga sin errores de consola ni de API`, async ({
    operatorPage,
    problems,
  }) => {
    await operatorPage.goto(route);
    await operatorPage.waitForLoadState('networkidle');

    await expect(operatorPage.locator('app-root')).not.toBeEmpty();
    expect(problems.failedRequests, 'respuestas de API con error').toEqual([]);
    expect(problems.consoleErrors, 'errores de consola').toEqual([]);
  });
}
