import { request } from '@playwright/test';
import { API } from './test';

const INGEST_KEY = process.env['E2E_INGEST_API_KEY'] ?? 'e2e-ingest-key';

/** Envía una lectura de incendio al backend local, como lo haría un sensor. */
export async function sendFireReading(nodeId: string) {
  const context = await request.newContext();
  const response = await context.post(`${API}/readings/`, {
    headers: { 'X-API-Key': INGEST_KEY },
    data: {
      node_id: nodeId,
      temperature: 95,
      humidity: 8,
      smoke: 95,
      flame: true,
      timestamp: new Date().toISOString(),
    },
  });
  const body = await response.json();
  await context.dispose();
  return { status: response.status(), body };
}

export async function getJson(path: string, token?: string) {
  const context = await request.newContext({
    extraHTTPHeaders: token ? { Authorization: `Token ${token}` } : {},
  });
  const response = await context.get(`${API}${path}`);
  const body = await response.json();
  await context.dispose();
  return body;
}

/** Cierra las alertas abiertas del nodo para que la prueba parta de un estado conocido. */
export async function closeOpenAlerts(nodeId: string) {
  const token = process.env['E2E_OPERATOR_TOKEN'];
  const context = await request.newContext({
    extraHTTPHeaders: { Authorization: `Token ${token}` },
  });
  for (const status of ['ACTIVE', 'ACKNOWLEDGED']) {
    const alerts = await (
      await context.get(`${API}/alerts/?node_id=${nodeId}&status=${status}`)
    ).json();
    for (const alert of Array.isArray(alerts) ? alerts : alerts.results) {
      await context.post(`${API}/alerts/${alert.id}/close/`);
    }
  }
  await context.dispose();
}
