# Tema oscuro y gráficas en vivo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tema oscuro único «sala de control» y tres gráficas en vivo (tendencia, barras de riesgo, miniaturas por nodo), listos para producción.

**Architecture:** Los colores se cambian solo en tokens de `src/styles.css`. Las gráficas son SVG a mano; la geometría de `series-chart.ts` se extrae a `shared/charts/chart-geometry.util.ts` y se reutiliza. El «tiempo real» es polling con `createVisiblePolling` (10 s) pidiendo solo lo nuevo a `readings/series/`; sin cambios de backend.

**Tech Stack:** Angular 22 (standalone, signals), RxJS 7, Vitest (`ng test`), Playwright, Leaflet.

**Spec:** `docs/superpowers/specs/2026-11-19-tema-oscuro-graficas-en-vivo-design.md`

## Global Constraints

- Sin dependencias nuevas; el bundle inicial (≈ 89,7 kB comprimidos) no debe crecer apreciablemente.
- Riesgo siempre verde `#1f8a4c`-familia / ámbar / rojo; datos solo en cian `#2fd0e0` y violeta `#9b8cff` y derivados; nunca verde, ámbar ni rojo para series.
- Paleta base: página `#0e1418`, superficie `#151d23`, texto `#e6eef2`, texto atenuado `#8aa0ab`, borde `#26343d`, riel `#080c0f`.
- Texto en español; rutas, comportamiento y aviso de prototipo sin cambios.
- Refresco en vivo cada 10 000 ms con `createVisiblePolling` (pausa con pestaña oculta, respeta 429).
- Contraste mínimo AA (4,5:1 texto, 3:1 elementos gráficos); cada gráfica con título, resumen textual y no depender solo del color (trazos con patrón distinto + etiqueta).
- `prefers-reduced-motion`: sin animaciones.
- Flujo: fase 13 en `TASKS.md`, un commit por tarea con sufijo `[13.x]` y marcada `[x]` en ese commit (código y su spec juntos; docs aparte); autor único, **sin** `Co-Authored-By`; sin push ni PR sin preguntar. Rama `design/tema-oscuro-en-vivo` desde `chore/mantenimiento-final`.
- Verificación de cada tarea: `npx ng test --watch=false`, `npm run lint`, `npm run format:check`.

## Review Focus

- Más de 10 nodos: la API rechaza >10 `node_id` → se piden solo los 10 de mayor riesgo; la gráfica lo indica («Mostrando 10 de N»).
- Respuesta 429 o error de red: la gráfica conserva los datos previos y muestra «Pausado»; no vacía la ventana.
- Sin lecturas en la ventana (nodo recién creado/offline): estado vacío legible, sin línea rota ni `NaN` en el SVG.
- Pestaña oculta varios minutos y vuelta: el siguiente refresco pide desde la última marca y no duplica ni deja huecos.
- Lecturas con `gas = null` o `ai = null`: miniaturas y barras no fallan y muestran «sin dato».

---

### Task 0: Rama, fase 13 en TASKS.md y documentos

**Files:** Modify `TASKS.md`; commit de `docs/superpowers/specs/…-design.md` y de este plan.

- [ ] **Step 1:** `git switch -c design/tema-oscuro-en-vivo` (desde `chore/mantenimiento-final`).
- [ ] **Step 2:** Añadir a `TASKS.md` la sección `## Fase 13 — Tema oscuro y gráficas en vivo` con las tareas 13.1–13.9 (títulos de abajo), todas `[ ]`.
- [ ] **Step 3:** `git add TASKS.md docs/superpowers && git commit -m "docs(tasks): fase 13, diseño y plan del tema oscuro y las gráficas en vivo"`.

### Task 13.1: `style(theme): tema oscuro único «sala de control»`

**Files:** Modify `src/styles.css` (tokens `:root`, borrar el bloque `@media (prefers-color-scheme: dark)` y su variante de `body[data-risk]`), `src/index.html` (`<meta name="theme-color" content="#080c0f">`, `color-scheme: dark`); Test `src/app/shared/utils/theme-contrast.spec.ts`.

**Interfaces:** Produces tokens nuevos `--data-1: #2fd0e0; --data-2: #9b8cff; --data-3: #6fb7ff; --data-4: #d58cff; --data-5: #7fe3c8` (para series; ninguno verde/ámbar/rojo de riesgo). Mantiene los nombres existentes (`--color-*`, `--class-*`, `--risk-*`, `--status-*`).

- [ ] **Step 1: Test.** En `theme-contrast.spec.ts` leer `src/styles.css` con `node:fs` y comprobar con una función local `contrast(hexA, hexB)` (luminancia WCAG): `--color-text`/`--color-surface` ≥ 4,5; `--color-text-muted`/`--color-surface` ≥ 4,5; `--risk-{normal,warning,fire}-text`/`-bg` ≥ 4,5; `--class-fire`/`--color-page` ≥ 3; cada `--data-n`/`--color-surface` ≥ 3; y que el CSS **no** contiene `prefers-color-scheme`.
- [ ] **Step 2:** Ejecutar el spec: debe fallar (existe `prefers-color-scheme` y los tokens son claros).
- [ ] **Step 3:** Redefinir los tokens con la paleta global y los valores de riesgo para fondo oscuro (`--risk-*-bg` oscuros con texto claro, bordes con la clase); riel `#080c0f`, `body[data-risk]` tiñe el riel con rojo/ámbar oscuros equivalentes. Ajustar a mano los valores hasta que el spec pase.
- [ ] **Step 4:** Spec + suite completa verdes; revisar a ojo `ng serve` en `/`, `/alertas`, `/login` buscando texto ilegible o bordes claros residuales (los componentes usan tokens, no hex; si hay hex sueltos, `grep -rn "#[0-9a-fA-F]\{6\}" src/app` y pasarlos a token).
- [ ] **Step 5:** Marcar `[x]` 13.1 y commit `style(theme): tema oscuro único «sala de control» [13.1]`.

### Task 13.2: `style(map): mapa oscuro`

**Files:** Modify `src/app/features/map/node-map.ts` (estilos del componente).

- [ ] **Step 1:** Añadir a los estilos `:host ::ng-deep .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(.85) contrast(.9) saturate(.5); }` y fondo del contenedor `var(--color-page)`; los marcadores y la atribución quedan fuera del panel de teselas, así que no se invierten; ajustar el texto de atribución a `--color-text-muted`.
- [ ] **Step 2:** Sin test unitario (CSS puro; justificado). Verificar `e2e/map.spec.ts` más adelante (13.8) y revisar a ojo marcadores legibles (fire/warning/normal).
- [ ] **Step 3:** Marcar `[x]` 13.2 y commit `style(map): mapa oscuro con filtro sobre las teselas de OpenStreetMap [13.2]`.

### Task 13.3: `refactor(charts): geometría compartida de las gráficas`

**Files:** Create `src/app/shared/charts/chart-geometry.util.ts`, `chart-geometry.util.spec.ts`; Modify `features/dashboard/series-chart.ts` (`createPlot`, `timeTicks`).

**Interfaces — Produces:**
```ts
export interface PlotBox { left: number; width: number; top: number; height: number }
export interface Pt { x: number; y: number }
export function plotPoints(values: number[], box: PlotBox): { points: Pt[]; minimum: number; maximum: number }
export function toPolyline(points: Pt[]): string  // "x,y x,y"
```
`plotPoints`: x repartido en `box.width` (un solo valor → `left + width/2`); y invertido en `box.height` con `spread = max - min || 1` (igual que hoy); lista vacía → `{points: [], minimum: 0, maximum: 0}`. `series-chart` pasa a usar `box = {left:48,width:576,top:24,height:104}`, sin cambiar su salida.

- [ ] **Step 1: Test.** `plotPoints([1,3],box)` → x = `left` y `left+width`, y del máximo = `top`, del mínimo = `top+height`; `plotPoints([5],box)` → un punto centrado, sin `NaN`; `plotPoints([],box)` → vacío; valores iguales → y finitos; `toPolyline` une con espacio.
- [ ] **Step 2:** Falla (módulo inexistente). **Step 3:** Implementar y reemplazar el cálculo inline de `createPlot` por `plotPoints`. **Step 4:** Spec nuevo y `series-chart.spec.ts` existente verdes sin editarlo. **Step 5:** commit `refactor(charts): geometría compartida de las gráficas [13.3]`.

### Task 13.4: `feat(readings): serie en vivo incremental`

**Files:** Create `src/app/shared/models/series.model.ts`, `src/app/shared/charts/live-window.util.ts`, `live-window.util.spec.ts`; Modify `core/services/readings.service.ts`, `readings.service.spec.ts`.

**Interfaces — Produces:**
```ts
export type SeriesField = 'temperature' | 'humidity' | 'smoke' | 'gas';
export interface SeriesPoint { timestamp: string; value: number }
export interface NodeSeries { node_id: string; count: number; average: number | null; points: SeriesPoint[] }
export interface SeriesResponse { field: SeriesField; from: string; to: string; series: NodeSeries[] }
// ReadingsService
getLiveSeries(nodeIds: string[], field: SeriesField, from: string): Observable<SeriesResponse>
// live-window.util
export function mergeWindow(previous: SeriesPoint[], incoming: SeriesPoint[], windowStartMs: number): SeriesPoint[]
```
`getLiveSeries` hace `GET {api}/readings/series/?node_id=a,b&field=…&from=…` (sin `to`, sin `step`). `mergeWindow`: une, deduplica por `timestamp`, ordena ascendente, descarta puntos con marca inválida o `< windowStartMs`.

- [ ] **Step 1: Tests.** Servicio con `HttpTestingController`: la URL lleva `node_id=SIM-001,SIM-002`, `field=smoke`, `from`, y no `step`. `mergeWindow`: dedupe (misma marca dos veces → una), orden, recorte de antiguos, marca inválida ignorada, `previous` vacío.
- [ ] **Step 2:** Fallan. **Step 3:** Implementar. **Step 4:** Verdes. **Step 5:** commit `feat(readings): serie en vivo incremental [13.4]`.

### Task 13.5: `feat(dashboard): tendencia en vivo de temperatura y humo`

**Files:** Create `features/dashboard/live-trend.ts`, `live-trend.spec.ts`; Modify `dashboard-page.ts` (insertar `<app-live-trend />` entre el resumen y `<app-node-grid />`), `dashboard-page.spec.ts` si cuenta hijos.

**Interfaces:** Consumes `DashboardStore.nodes()`, `ReadingsService.getLiveSeries`, `mergeWindow`, `plotPoints`, `toPolyline`, `createVisiblePolling`. Produces constante exportada `LIVE_REFRESH_MS = 10_000` en `core/visible-polling.ts` (también usada por 13.7) y `export function topRiskNodeIds(nodes: Node[], limit = 10): string[]` (orden FIRE > WARNING > NORMAL > null, desempate por `node_id`) en `features/dashboard/live-trend.ts`.

Comportamiento: selector de métrica (temperatura | humo); ventana `WINDOW_MS = 15 * 60_000`; primer refresco `from = now - WINDOW_MS`, siguientes `from = última marca conocida`; estado por nodo en una señal; cada serie con color `--data-n` **y** patrón de trazo distinto (`stroke-dasharray`) y etiqueta final con `node_id`; indicador «● En vivo» (se vuelve «Pausado» ante error o pestaña oculta); texto «Mostrando 10 de N nodos» si N > 10; resumen `sr-only` con último valor por nodo; estados vacío y error con `app-state-message`.

- [ ] **Step 1: Tests (`live-trend.spec.ts`, con `HttpTestingController` y temporizadores simulados).** (a) `topRiskNodeIds` ordena por riesgo y recorta a 10; (b) primer refresco pide `from` ≈ now−15 min y el siguiente pide `from` = última marca; (c) respuesta 429/500 conserva las líneas y muestra «Pausado»; (d) sin puntos → estado vacío, ningún `NaN` en el `points` del SVG; (e) con 12 nodos muestra «Mostrando 10 de 12»; (f) cada polilínea tiene `stroke-dasharray` distinto entre las primeras cinco.
- [ ] **Step 2:** Fallan. **Step 3:** Implementar el componente (OnPush, `isPlatformBrowser` como en `series-chart`). **Step 4:** Verdes + suite. **Step 5:** commit `feat(dashboard): tendencia en vivo de temperatura y humo [13.5]`.

### Task 13.6: `feat(dashboard): barras de riesgo por nodo`

**Files:** Create `features/dashboard/risk-bars.ts`, `risk-bars.spec.ts`; Modify `dashboard-page.ts` (junto a `<app-live-trend />`).

**Interfaces:** `export function riskBarValue(reading: Reading): number` (0–1): `reading.ai?.probabilities?.['FIRE']` si es número finito; si no, por clase `NORMAL=0.1, WARNING=0.5, FIRE=1`; sin riesgo → 0. Componente `app-risk-bars` lee `DashboardStore.summary()?.latest_readings` (sin petición nueva), ordena de mayor a menor valor, barra con color de clase (`--class-*`) y etiqueta de texto de la clase + porcentaje.

- [ ] **Step 1: Tests.** `riskBarValue` con IA, sin IA (`ai: null`), con probabilidad `NaN`, sin `risk_level`; el componente ordena descendente y muestra texto «Incendio»/«Advertencia»/«Normal» además del color; lista vacía → estado vacío.
- [ ] **Step 2–4:** Falla, implementar, verdes. **Step 5:** commit `feat(dashboard): barras de riesgo por nodo [13.6]`.

### Task 13.7: `feat(nodes): miniaturas de sensores en vivo en el detalle del nodo`

**Files:** Create `features/nodes/sensor-tiles.ts`, `sensor-tiles.spec.ts`; Modify `node-detail-page.ts` (insertar `<app-sensor-tiles [nodeId]="currentNode.node_id" />` antes de `<app-series-chart …>`).

**Interfaces:** Consume `ReadingsService.getForNode(nodeId, { order: 'desc', limit: 60 })` cada `LIVE_REFRESH_MS`, `plotPoints`, `toPolyline`. Cuatro mosaicos (Temperatura °C, Humedad %, Humo, Gas) con último valor y mini-línea; `gas` nulo → «Sin dato» (sin línea); error → conserva datos y marca «Pausado».

- [ ] **Step 1: Tests.** Con 60 lecturas dibuja cuatro mosaicos con el valor más reciente (la API devuelve `desc`; el componente invierte para dibujar); `gas: null` en todas → «Sin dato» sin `NaN`; una sola lectura → punto centrado; error conserva los valores previos.
- [ ] **Step 2–4:** Falla, implementar, verdes. **Step 5:** commit `feat(nodes): miniaturas de sensores en vivo en el detalle del nodo [13.7]`.

### Task 13.8: `test(e2e): gráficas en vivo y tema oscuro`

**Files:** Modify `e2e/dashboard.spec.ts`, `e2e/map.spec.ts`, `e2e/smoke.spec.ts`, `e2e/pages/*` si hace falta.

- [ ] **Step 1:** Levantar backend de pruebas y tokens según `e2e/README.md` (SQLite en scratchpad, `seed_demo --reset --seed 1`, Chrome del sistema, `video: 'off'`).
- [ ] **Step 2:** Añadir al e2e: el panel muestra la tendencia con al menos una polilínea por nodo sembrado; una segunda lectura enviada por `POST /api/readings/` con `e2e-ingest-key` aparece en la gráfica en ≤ 15 s sin recargar; el detalle de `SIM-001` muestra cuatro mosaicos; `smoke.spec.ts` sigue sin errores de consola ni de API; `getComputedStyle(body).backgroundColor` es `rgb(14, 20, 24)`.
- [ ] **Step 3:** `npx playwright test` en verde (chromium y mobile; repetir con `--workers=1` si hay «Target crashed»). Commit `test(e2e): gráficas en vivo y tema oscuro [13.8]`.

### Task 13.9: `docs: DESIGN.md, capturas, medición de producción`

**Files:** Modify `DESIGN.md`, `.impeccable/design.json`, `README.md`, `docs/capturas/*`, `TASKS.md`.

- [ ] **Step 1:** Actualizar `DESIGN.md` y `design.json` con la paleta y las gráficas construidas; regenerar las capturas de `docs/capturas/` con datos del backend local.
- [ ] **Step 2:** Medir en producción-like: `ng build` (comparar el tamaño inicial contra ≈ 89,7 kB; si crece más de ~5 kB, mover las gráficas a carga diferida con `@defer`), y repetir la medición móvil 4G lenta/CPU 4× del 12.4 (FCP/LCP/CLS). Anotar las cifras en `TASKS.md`.
- [ ] **Step 3:** Contar peticiones por minuto en el panel (devtools/Playwright `request` events) y confirmar que quedan muy por debajo de `THROTTLE_READ_RATE` por defecto (`120/min`); anotar el resultado.
- [ ] **Step 4:** Commit `docs: tema oscuro, gráficas en vivo, capturas y mediciones [13.9]`. No hacer push ni abrir PR sin preguntar.
