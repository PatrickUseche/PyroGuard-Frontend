# Registro de pruebas

## Ejecución automatizada

- **Fecha:** 2026-11-02
- **Comando:** `npx ng test --watch=false`
- **Resultado real:** correcto; 29 archivos de prueba y 93 pruebas aprobadas (duración informada: 8.01 s).

## Especificaciones y cobertura

| Archivo spec                                                          | Cobertura                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/app/app.spec.ts`                                                 | Creación de la aplicación raíz.                                                        |
| `src/app/core/interceptors/api-error.interceptor.spec.ts`             | Traducción de errores HTTP, red, 429/Retry-After y errores de login.                   |
| `src/app/core/interceptors/auth-token.interceptor.spec.ts`            | Envío del token solo a la API y limpieza de sesión ante 401.                           |
| `src/app/core/layout/app-layout.spec.ts`                              | Navegación, indicador de salud, aviso permanente y acción de sesión.                   |
| `src/app/core/layout/health-indicator.spec.ts`                        | Indicador disponible usando el último ciclo exitoso del dashboard.                     |
| `src/app/core/services/alerts.service.spec.ts`                        | Consultas de alertas, filtros/paginación y transiciones reconocer/cerrar.              |
| `src/app/core/services/auth.service.spec.ts`                          | Login, persistencia del token y logout.                                                |
| `src/app/core/services/dashboard.service.spec.ts`                     | Consulta del resumen del dashboard.                                                    |
| `src/app/core/services/health.service.spec.ts`                        | Estados online, 404 desconocido y fallo de red.                                        |
| `src/app/core/services/nodes.service.spec.ts`                         | Lista de nodos, detalle y estado.                                                      |
| `src/app/core/services/readings.service.spec.ts`                      | Filtros, total paginado, lecturas por nodo y series con rangos estándar/personalizado. |
| `src/app/core/visible-polling.spec.ts`                                | Sondeo inmediato/periódico, pausa por pestaña oculta, no solapamiento y Retry-After.   |
| `src/app/features/alerts/alert-detail-page.spec.ts`                   | Detalle, acciones autenticadas, respuesta 404 y delegación de acciones.                |
| `src/app/features/alerts/alerts-history-page.spec.ts`                 | Historial, filtros, paginación y enlaces.                                              |
| `src/app/features/auth/login-page.spec.ts`                            | Login exitoso y mensaje de error del backend.                                          |
| `src/app/features/dashboard/active-alerts.spec.ts`                    | Orden de alertas, datos visibles, sesión y acciones con éxito/conflicto.               |
| `src/app/features/dashboard/dashboard-page.spec.ts`                   | Métricas, riesgo global, leyenda y mensaje de reintento inicial.                       |
| `src/app/features/dashboard/dashboard-store.spec.ts`                  | Ciclos de datos, errores parciales, polling, 429 y backoff de arranque en frío.        |
| `src/app/features/dashboard/node-grid.spec.ts`                        | Estados online/offline/unknown, riesgo y probabilidad de IA.                           |
| `src/app/features/dashboard/readings-table.spec.ts`                   | Sensores, trazabilidad IA, filtros de fecha, validación y estado vacío.                |
| `src/app/features/dashboard/series-chart.spec.ts`                     | Nodo/rango, intervalo personalizado, gráficas y disponibilidad de gas.                 |
| `src/app/features/map/node-map.spec.ts`                               | Filtrado por coordenadas, marcadores accesibles, nodo simulado, ficha y estado vacío.  |
| `src/app/features/nodes/node-detail-page.spec.ts`                     | Conexión/riesgo desactualizado, ubicación y fecha de registro.                         |
| `src/app/shared/components/connection-badge/connection-badge.spec.ts` | Etiqueta e icono accesibles de conexión.                                               |
| `src/app/shared/components/risk-badge/risk-badge.spec.ts`             | Etiquetas e iconos de riesgo y estado desactualizado.                                  |
| `src/app/shared/components/simulated-badge/simulated-badge.spec.ts`   | Insignia con icono/texto para nodos simulados y omisión para nodos reales.             |
| `src/app/shared/components/state-message/state-message.spec.ts`       | Roles accesibles de carga y error.                                                     |
| `src/app/shared/utils/date-format.util.spec.ts`                       | Formato relativo, fechas completas y valores inválidos.                                |
| `src/app/shared/utils/simulated-node.util.spec.ts`                    | Detección del prefijo `SIM-`.                                                          |

## Comprobaciones manuales pendientes

- [ ] Verificar responsive a 360, 768 y 1280 px con datos locales y sin scroll horizontal del body.
- [ ] Comprobar contraste AA en temas claro y oscuro.
- [ ] Probar login, reconocer y cerrar alertas con backend local.
- [ ] Probar el mapa con nodos con coordenadas, selección por teclado y enlace al detalle.
