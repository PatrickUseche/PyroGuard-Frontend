# Tema oscuro «sala de control» y gráficas en vivo — diseño

Fecha: 2026-11-19 · Repo: PyroGuard-Frontend · Todo se construye pensando en producción (Vercel + Render).

## Intención

El usuario no está a gusto con la paleta actual («cartel de peligro de incendio», verde conífera sobre claro). Quiere una paleta oscura tipo sala de control y gráficas que se sientan en vivo. Quien vigila el panel (a menudo de noche, en móvil con red lenta) debe ver de un vistazo qué nodo se calienta.

## Objetivos

- Paleta oscura elegida por el usuario (opción A de la maqueta): fondo casi negro (~`#0e1418`), superficies `#151d23`, texto `#e6eef2`, datos en cian (`#2fd0e0`) y violeta (`#9b8cff`).
- El riesgo conserva su código: normal verde, advertencia ámbar, incendio rojo. Con contraste AA sobre el fondo oscuro (revisar el rojo y los textos de insignias).
- Gráficas nuevas en vivo:
  1. Panel principal: tendencia en vivo de temperatura y humo de todos los nodos (ventana deslizante de 15 min, indicador «en vivo») y barras de riesgo por nodo.
  2. Detalle de nodo: miniaturas de las cuatro métricas (temperatura, humedad, humo, gas) con la lectura actual; la gráfica grande actual queda como detalle.
  3. Mapa: solo paleta oscura (teselas oscuras de Leaflet), sin gráficas nuevas.
- Sin cambios en el backend: se usa `readings/series/` (admite varios nodos, `from`/`to`, `step`).

## No objetivos / anti-objetivos

- No websockets ni SSE. No dependencias nuevas de gráficas.
- No cambiar rutas, textos en español, aviso de prototipo ni comportamiento existente.
- Fallo si: el rojo/ámbar/verde se confunden con los colores de datos (cian/violeta), el bundle inicial crece de forma notable, o las consultas superan el límite de peticiones de Render.

## Restricciones (producción)

- Bundle inicial hoy ≈ 89,7 kB comprimidos; no debe crecer apreciablemente (las gráficas viven en rutas ya cargadas por separado o en carga diferida).
- Actualización en vivo con `createVisiblePolling` (se pausa con la pestaña oculta y respeta el 429/`Retry-After`). Peticiones incrementales: pedir solo desde la última lectura recibida y recortar la ventana en cliente, con intervalo agrupado (una petición por gráfica, no por nodo).
- `prefers-reduced-motion`: sin animaciones de deslizamiento, solo actualización directa.
- Accesibilidad: cada gráfica con título, resumen textual (`aria-label`/tabla oculta) y no depender solo del color (formas/etiquetas además del tono).
- Los tokens definidos en `src/styles.css` (`--color-*`, `--class-*`, `--risk-*`) se redefinen; los componentes usan tokens, no hex.
- Rutina de trabajo: fase nueva en `TASKS.md`, una tarea por commit con sufijo `[x.y]`, rama desde `main` al día, un PR; autor único, sin Co-Authored-By; no hacer push ni abrir PR sin preguntar.

## Enfoques considerados

1. **SVG a mano, reutilizando `series-chart.ts`** (elegido). Sin dependencias, bundle estable, encaja con el sistema. Costo: más código propio.
2. uPlot (~25 kB): muy buen rendimiento en vivo, pero dependencia nueva y dos formas de graficar conviviendo.
3. Chart.js/ECharts: +70–300 kB, excesivo.

El usuario eligió el 1.

## Decisiones del usuario

Paleta A; las tres áreas de gráficas anteriores; SVG a mano; consultas periódicas (sin stream).

## Decisiones mías (a revisar)

- Ventana de 15 min y refresco de 5–10 s (hoy el dashboard usa 10 s); se ajusta tras medir carga contra Render.
- Cian para la métrica primaria y violeta para la secundaria; el resto de nodos con tonos derivados de estos, nunca verde/ámbar/rojo.
- Extraer del `series-chart.ts` las piezas de dibujo (escalas, ejes, trazado) a un módulo compartido antes de crear las gráficas nuevas, sin romper los tests de su spec.
- Mapa oscuro con un filtro CSS (invertir + rotar tono) sobre las teselas actuales de OpenStreetMap, sin proveedor nuevo: evita dudas de licencia de CARTO en producción y no añade peticiones externas.
- El tema oscuro pasa a ser el único (hoy hay uno claro y otro oscuro según `prefers-color-scheme`); se retira el tema claro.
- Barras de riesgo: usan `summary.latest_readings` (ya se consulta cada 10 s), con la probabilidad de FIRE de la IA y, si falta, un valor por clase.
- Tendencia en vivo: una petición a `readings/series/` por refresco (hasta 10 nodos, el máximo de la API; los de mayor riesgo primero). Miniaturas del nodo: una petición `readings` por refresco.

## Pendiente para quien construye

Estructura exacta de componentes y archivos; detalle del cálculo incremental (`from` = última marca de tiempo); umbrales de contraste medidos; actualizar `DESIGN.md`, `.impeccable/design.json`, las capturas de `docs/capturas/` y los tests unitarios y e2e (el e2e depende de selectores como `.stats`).
