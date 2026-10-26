# TASKS — PyroGuard Frontend (Angular)

Plan de mejoras del dashboard. Cada task es un commit; el mensaje del commit es el texto de la task con su sufijo `[x.y]`.
Al terminarla se marca `[x]` en ese mismo commit.

Este repo es parte de un sistema de tres: **PyroGuard-Backend** (la API que consume), **PyroGuard-IA** (servicio de
inferencia) y **PyroGuard-Frontend** (este). Cada repo tiene su propio `TASKS.md`; las dependencias entre ellos se indican
en la task.

Estado de partida (2026-10-25): una tabla de lecturas que consulta `/readings/` cada 5 segundos, con la URL del backend
escrita en el código. No muestra riesgo, alertas ni el resultado de la IA, y `environment.ts` de producción apunta al propio frontend.

## Fase 1 — Base

- [ ] fix(env): que `apiUrl` de producción apunte al backend y no al propio frontend de Vercel [1.1]
- [ ] refactor(api): que `sensor.ts` use `environment.apiUrl` en lugar de la URL fija [1.2]
- [ ] feat(models): tipos para riesgo, resultado de la IA, alertas y nodos según el contrato del backend [1.3]
- [ ] refactor(services): servicios para `dashboard/summary`, `readings`, `alerts` y `nodes` [1.4]

## Fase 2 — Dashboard

- [ ] feat(dashboard): tarjetas de resumen y riesgo global con `/dashboard/summary/` [2.1]
- [ ] feat(dashboard): semáforo de riesgo y estado (ONLINE, OFFLINE, UNKNOWN) por nodo [2.2]
- [ ] feat(alerts): lista de alertas activas con nivel y número de ocurrencias [2.3]
- [ ] feat(readings): tabla de lecturas con el riesgo final y el resultado de la IA [2.4]
- [ ] feat(charts): gráfico histórico de temperatura, humo y humedad [2.5] (necesita el backend [2.3])
- [ ] feat(ui): estados de carga, error y sin datos, e indicador de salud con `/health/` [2.6] (necesita el backend [4.2])

## Fase 3 — Operación

- [ ] feat(auth): inicio de sesión con el token del backend [3.1]
- [ ] feat(alerts): reconocer y cerrar alertas desde la interfaz [3.2]
- [ ] style: diseño responsive para móvil y escritorio [3.3]
- [ ] test: pruebas de los servicios y de los componentes del dashboard [3.4]

## Fase 4 — Despliegue

- [ ] chore(deploy): revisar `vercel.json` y las variables de entorno de producción [4.1]
- [ ] docs: README del frontend con la configuración y los comandos [4.2]
