import { test, expect } from './fixtures/test';

test.describe('sesión', () => {
  test('sin sesión se redirige al login conservando la ruta pedida', async ({ page }) => {
    await page.goto('/alertas');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Falertas/);
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Crear cuenta/ })).toBeVisible();
  });

  test('con token válido se entra al panel y se ve el usuario', async ({ operatorPage }) => {
    await operatorPage.goto('/');

    await expect(operatorPage).not.toHaveURL(/login/);
    await expect(operatorPage.getByRole('heading', { name: 'Centro de control' })).toBeVisible();
    await expect(operatorPage.getByText('@e2e_operator')).toBeVisible();
  });

  test('un token inválido o vencido devuelve al login', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pyroguard-token', 'token-invalido'));
    await page.goto('/');

    await expect(page).toHaveURL(/login/);
  });

  test('cerrar sesión avisa al backend, borra el token local y vuelve al login', async ({
    operatorPage,
  }) => {
    // Se intercepta la llamada para no invalidar el token compartido por las demás pruebas.
    let logoutCalls = 0;
    await operatorPage.route('**/api/auth/logout/', (route) => {
      logoutCalls += 1;
      return route.fulfill({ status: 204 });
    });
    await operatorPage.goto('/');
    await operatorPage.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(operatorPage).toHaveURL(/login/);
    expect(logoutCalls).toBe(1);
    expect(await operatorPage.evaluate(() => localStorage.getItem('pyroguard-token'))).toBeNull();
  });

  test('un usuario con sesión no ve el login ni el registro', async ({ operatorPage }) => {
    await operatorPage.goto('/login');

    await expect(operatorPage).not.toHaveURL(/login/);
  });
});
