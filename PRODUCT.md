# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Operadores de monitoreo forestal. Vigilan nodos de sensores y alertas de incendio desde una pantalla de trabajo (escritorio) y a veces desde el móvil; reconocen y cierran alertas. Requieren sesión con una cuenta de Google `@gmail.com`.

## Product Purpose

PyroGuard Frontend es el panel web de PyroGuard: muestra el riesgo global, el estado de los nodos, las lecturas de sensores (temperatura, humedad, humo), las alertas activas e históricas y un mapa. Consume la API de PyroGuard-Backend; la inferencia de IA ocurre en el servicio PyroGuard-IA, nunca en el navegador. Éxito: el operador distingue de un vistazo si hay riesgo y dónde, y actúa sobre las alertas.

## Positioning

Panel único que une la clasificación de riesgo de IA por nodo con lecturas crudas y gestión de alertas, para detección temprana de incendios forestales.

## Operating Context

Modo Operate. Datos que se actualizan cada 10 s (pausado con la pestaña oculta); lecturas y gráficos bajo demanda. Despliegue en Vercel, backend en Render. Nodos simulados (p. ej. `SIM-001`) se marcan como «Simulado».

## Capabilities and Constraints

- Rutas: `/` resumen, `/nodos/:id`, `/alertas` (historial con filtros estado/nivel/nodo), detalle de alerta, mapa, `/login`, `/registro`.
- Estados de riesgo: normal, advertencia, incendio; estados de conexión y de IA con estados de error/desconocido explícitos.
- Angular 22 standalone, estilos inline por componente, tokens en `src/styles.css`, modo claro/oscuro por `prefers-color-scheme`.
- Interfaz en español. Sin dependencias nuevas para el pulido.
- Prototipo académico con datos sintéticos; no es un detector certificado de incendios.

## Brand Commitments

Nombre PyroGuard, texto en español y paleta de riesgo actual se conservan. El texto y ubicación del aviso de prototipo pueden ajustarse (confirmado por el usuario), pero el aviso debe seguir existiendo.

## Evidence on Hand

Capturas en `docs/capturas/`, pruebas unitarias (Vitest) y e2e (Playwright). No hay testimonios ni métricas de uso; no inventar ninguna.

## Product Principles

- El riesgo se lee antes que cualquier otro dato; nunca depende solo del color.
- Los estados de carga, error, vacío y desconocido son parte del producto, no excepciones.
- Honestidad sobre el origen de los datos: simulado y prototipo se declaran.
- Funciona en móvil (360 px) con los datos antes que los accesorios.

## Accessibility & Inclusion

Objetivo WCAG AA: contraste, foco visible, navegación por teclado, `prefers-reduced-motion` con alternativa intencional.
