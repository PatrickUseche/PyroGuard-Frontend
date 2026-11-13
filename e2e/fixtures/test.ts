import { test as base, expect, type Page } from '@playwright/test';

export const API = process.env['E2E_API_URL'] ?? 'http://localhost:8000/api';
const TOKEN_KEY = 'pyroguard-token';

export interface PageProblems {
  consoleErrors: string[];
  failedRequests: string[];
}

function watch(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], failedRequests: [] };
  page.on('pageerror', (error) => problems.consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.url().startsWith(API) && response.status() >= 400) {
      problems.failedRequests.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });
  return problems;
}

async function signIn(page: Page, token: string | undefined) {
  if (!token) throw new Error('Falta el token de prueba (E2E_OPERATOR_TOKEN / E2E_VIEWER_TOKEN).');
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [TOKEN_KEY, token],
  );
}

export const test = base.extend<{
  problems: PageProblems;
  operatorPage: Page;
  viewerPage: Page;
}>({
  problems: async ({ page }, use) => {
    await use(watch(page));
  },
  operatorPage: async ({ page }, use) => {
    await signIn(page, process.env['E2E_OPERATOR_TOKEN']);
    await use(page);
  },
  viewerPage: async ({ page }, use) => {
    await signIn(page, process.env['E2E_VIEWER_TOKEN']);
    await use(page);
  },
});

export { expect };
