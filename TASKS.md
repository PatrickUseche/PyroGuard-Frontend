# TASKS — PyroGuard Frontend (Angular)

Plan de mejoras del dashboard. Cada task es un commit; el mensaje del commit es el texto de la task con su sufijo `[x.y]`.
Al terminarla se marca `[x]` en ese mismo commit.

Este repo es parte de un sistema de tres: **PyroGuard-Backend** (la API que consume), **PyroGuard-IA** (servicio de
inferencia) y **PyroGuard-Frontend** (este). Cada repo tiene su propio `TASKS.md`; las dependencias entre ellos se indican
en la task.

Estado de partida (2026-10-25): una tabla de lecturas que consulta `/readings/` cada 5 segundos, con la URL del backend
escrita en el código. No muestra riesgo, alertas ni el resultado de la IA, y `environment.ts` de producción apunta al propio frontend.

## Fase 0 — Preparación

- [x] chore(git): normalizar saltos de línea con .gitattributes [0.1] (no fue necesario: `git status` estaba limpio)
- [x] test: corregir las pruebas de plantilla que no compilan [0.2]

## Fase 1 — Base

- [x] fix(env): que `apiUrl` de producción apunte al backend y no al propio frontend de Vercel [1.1]
- [x] refactor(api): que `sensor.ts` use `environment.apiUrl` en lugar de la URL fija [1.2]
- [x] refactor(api): eliminar `ApiService` obsoleto que apunta a `/admin/` [1.2]
- [x] feat(models): tipos para riesgo, resultado de la IA, alertas y nodos según el contrato del backend [1.3]
- [x] refactor(services): servicios para `dashboard/summary`, `readings`, `alerts` y `nodes` [1.4]

## Fase 2 — Dashboard

- [x] style(theme): tokens de diseño (colores de riesgo, tipografía, espaciado) en `styles.css` con modo claro y oscuro [2.7]
- [x] feat(layout): cabecera, navegación, pie con aviso de prototipo y enrutado perezoso [2.8]
- [x] feat(shared): componentes `RiskBadge`, `ConnectionBadge` e iconos SVG [2.9]
- [x] feat(dashboard): store con signals y sondeo único cada 10 s que se pausa con la pestaña oculta [2.10]
- [x] chore(html): `lang="es"`, título y descripción de la página [2.12]
- [x] feat(dashboard): tarjetas de resumen y riesgo global con `/dashboard/summary/` [2.1]
- [x] feat(dashboard): semáforo de riesgo y estado (ONLINE, OFFLINE, UNKNOWN) por nodo [2.2]
- [x] feat(alerts): lista de alertas activas con nivel y número de ocurrencias [2.3]
- [x] feat(readings): tabla de lecturas con el riesgo final y el resultado de la IA [2.4]
- [x] feat(charts): gráfico histórico de temperatura, humo y humedad [2.5] (necesita el backend [4.8])
- [x] feat(ui): estados de carga, error y sin datos, e indicador de salud con `/health/` [2.6] (necesita el backend [6.4])
- [x] refactor(app): eliminar la vista de depuración y `SensorService` [2.11]

## Fase 3 — Operación

- [x] feat(auth): inicio de sesión con el token del backend [3.1]
- [x] feat(auth): interceptor que añade `Authorization: Token` y cierra la sesión ante un 401 [3.5]
- [x] feat(nodes): página de detalle del nodo con estado, última lectura, alertas y gráfico [3.6]
- [x] feat(alerts): historial de alertas con filtros por estado y nivel y paginación [3.7]
- [x] feat(alerts): reconocer y cerrar alertas desde la interfaz [3.2]
- [x] style: diseño responsive para móvil y escritorio [3.3]
- [x] test: pruebas de los servicios y de los componentes del dashboard [3.4]

## Fase 4 — Despliegue

- [x] chore(deploy): revisar `vercel.json` y las variables de entorno de producción [4.1]
- [x] chore(build): quitar los restos de SSR (server.ts, hidratación, script `serve:ssr`) [4.3]
- [x] docs: README del frontend con la configuración y los comandos [4.2]
- [x] chore(deps): revisar y resolver las vulnerabilidades de npm audit --omit=dev sin subir versiones mayores [4.4]
- [x] docs(tasks): corregir las referencias cruzadas a las tasks del backend en TASKS.md [4.5]
- [x] chore(ci): workflow de GitHub Actions que corre ng build y ng test en cada pull request [4.6] (hecha como [6.1])
- [x] chore(lint): configurar angular-eslint y corregir los avisos [4.7] (hecha como [6.2])
- [x] chore(format): script format:check con Prettier y archivos formateados [4.8] (hecha como [6.3])
- [x] docs: capturas del dashboard en el README [4.9] (hecha como [6.4] y [6.7])

## Fase 5 — Brechas de la auditoría

- [x] style(a11y): corregir el contraste del botón primario en modo oscuro con tokens propios [5.1]
- [x] feat(alerts): mostrar la probabilidad en las alertas activas y en el historial [5.2]
- [x] feat(alerts): `AlertsService.getById` y página de detalle de alerta en `/alertas/:id` [5.3]
- [x] feat(alerts): enlazar cada alerta con su detalle y con el nodo [5.4]
- [x] feat(nodes): ubicación y fecha de registro en el detalle del nodo [5.5]
- [x] fix(nodes): mostrar el riesgo de un nodo UNKNOWN como «sin datos» y no como normal [5.6]
- [x] feat(readings): filtro por rango de fechas en la tabla de lecturas [5.7]
- [x] feat(charts): filtro por rango de fechas y selector de variables en el gráfico [5.8]
- [x] feat(readings): versión del modelo y probabilidad visibles, sin depender del tooltip [5.9]
- [x] feat(dashboard): leyenda de categorías NORMAL, WARNING y FIRE y probabilidad de IA en cada nodo [5.10]
- [x] feat(map): dependencia Leaflet y componente de mapa base [5.11]
- [x] feat(map): marcadores por nivel de riesgo con icono y texto accesible [5.12]
- [x] feat(map): selección de nodo con ficha y enlace al detalle, y estado sin coordenadas [5.13]
- [x] test(map): pruebas del mapa [5.14]
- [x] refactor(polling): utilidad de sondeo que se pausa con la pestaña oculta y respeta `Retry-After` [5.15]
- [x] fix(polling): usar esa utilidad en salud, tabla de lecturas y gráfico [5.16]
- [x] feat(ui): reintentos automáticos con mensaje durante el arranque en frío del backend [5.17]
- [x] feat(dashboard): marcar como «Simulado» los nodos con prefijo `SIM-` [5.18]
- [x] docs: cómo probar el flujo con el simulador del backend [5.19]
- [x] docs(deploy): CORS, navegadores soportados y pasos de despliegue en Vercel [5.20]
- [x] test(layout): pruebas de cabecera, navegación y pie [5.21]
- [x] docs(test): registro de resultados de pruebas en `docs/PRUEBAS.md` [5.22]

## Fase 6 — Calidad (opcional)

- [x] chore(ci): workflow de GitHub Actions con `ng build` y `ng test` [6.1]
- [x] chore(lint): angular-eslint y corrección de avisos [6.2]
- [x] chore(format): script `format:check` con Prettier [6.3]
- [x] docs: capturas del dashboard en el README [6.4]
- [x] build(leaflet): permitir la dependencia CommonJS de Leaflet en angular.json para silenciar el aviso [6.5]
- [x] chore(deps): actualizar `@angular/forms` dentro de su versión menor si corrige `zod` y documentar el resultado [6.6]
- [x] docs: capturas reales del dashboard, detalle de nodo, alertas y mapa en `docs/capturas/` [6.7]

## Fase 7 — Acceso con Google

- [x] feat(auth): `googleClientId` en los environments y tipos mínimos del SDK de Google [7.1]
- [x] feat(auth): servicio que carga el SDK de Google solo en la página de acceso y entrega la credencial [7.2]
- [x] feat(auth): `AuthService` con acceso con Google, usuario actual y cierre de sesión en el servidor [7.3]
- [x] feat(auth): página `/login` con el botón «Continuar con Google» y estados de error [7.4]
- [x] refactor(auth): retirar el formulario de usuario y contraseña y redirigir `/registro` a `/login` [7.5]
- [x] feat(alerts): mostrar reconocer y cerrar solo a quien puede gestionar alertas, y el usuario en la cabecera [7.6]
- [x] test(auth): pruebas del acceso con Google y de los permisos [7.7]
- [x] docs(auth): README con la configuración del Client ID [7.8]

## Fase 8 — Acceso con registro

- [x] feat(auth): guards que exigen sesión y llevan a `/login` conservando `returnUrl` [8.1]
- [x] feat(layout): mostrar solo la marca en las pantallas de acceso y la navegación solo con sesión [8.2]
- [x] feat(auth): `ApiError` con código y datos extra, y `AuthService` con registro pendiente de Google [8.3]
- [x] feat(auth): página `/registro` con la verificación de Google y el formulario de nombre de usuario [8.4]
- [x] feat(auth): `/login` lleva a `/registro` cuando la cuenta de Google aún no existe [8.5]
- [x] feat(auth): cierre de sesión y respuestas 401 llevan a `/login`, y la cabecera muestra el nombre de usuario [8.6]
- [x] test(auth): pruebas de guards, registro y navegación [8.7]
- [x] docs(auth): README del flujo de registro e inicio de sesión [8.8]

## Fase 9 — Pruebas E2E con Playwright

- [x] chore(e2e): instalar Playwright y configurar los proyectos de escritorio y móvil [9.1]
- [x] test(e2e): sesión, panel, mapa y detalle de nodo contra el backend local [9.2]
- [x] test(e2e): alertas (reconocer, permisos del usuario sin grupo y filtro por estado) [9.3]
- [x] docs(e2e): README de `e2e/` con el backend de pruebas y los tokens [9.4]

## Fase 10 — Auditoría y pulido del frontend con impeccable

Alcance: rediseño completo autorizado por el usuario el 2026-11-18 (se conservan producto, rutas, comportamiento, texto en español y aviso de prototipo). Mundo visual elegido: «Cartel de peligro de incendio» (escala de tres clases con puntero). Rama `polish/impeccable-audit`.

- [x] docs(design): PRODUCT.md con usuarios, propósito y restricciones del panel [10.1]
- [x] style(theme): tokens del cartel de peligro (riel conífera, clases normal/advertencia/incendio, reduced-motion con alternativa) [10.2]
- [x] feat(layout): riel lateral en escritorio y barra superior en móvil [10.3]
- [x] feat(shared): `RiskScale` (banda con puntero y mini-escala por nodo) e insignia de riesgo en esmalte [10.4]
- [x] refactor(dashboard): banda de escala, franja de cifras y nodos con mini-escala; fuera kickers, bordes de color y leyenda aparte [10.5]
- [x] chore(fonts): tipografía de señalización Overpass autoalojada [10.6]
- [x] feat(layout): el riesgo global tiñe el riel (incendio rojo, advertencia ámbar) [10.9]
- [x] style(pages): paneles, botones, títulos y estados vacíos del cartel en alertas, nodo, mapa, login, registro, tabla y gráfico [10.10]
- [x] fix(ui): plurales («1 alerta»), caption oculto de lecturas en móvil y riel móvil compacto [10.11]
- [x] feat(auth): aviso de servidor en reposo mientras se verifica la cuenta [10.12]
- [x] docs(design): DESIGN.md y `.impeccable/design.json` desde el mundo construido [10.7]
- [x] docs(capturas): regenerar las 8 capturas de `docs/capturas/` con datos del backend local [10.8]
- [x] test(e2e): el resumen se localiza con `.stats` tras el rediseño [10.13]
- [x] fix(layout): el riesgo global tiñe el riel en todas las rutas con sesión [10.14]
- [x] fix(dashboard): cifras con jerarquía, nodos por gravedad sin desbordes y banda con contraste [10.15]
- [x] fix(pages): detalle de nodo, historial alineado, sello legible y alarma del mapa siempre encima [10.16]
- [x] style(ui): radios y marcador del mapa alineados con el sistema (2px, sin sombras) [10.17]
- [x] feat(map): marcadores compactos salvo advertencia e incendio [10.18]
- [x] feat(ui): el puntero de la banda se desliza entre clases (600 ms, 80 ms con reduced-motion) [10.19]
- [x] feat(dashboard): temperatura y humedad medias de los nodos en línea [10.20]
- [x] test(ui): pruebas de RiskScale y de los marcadores del mapa [10.21]

## Fase 11 — Acceso con Google propio

- [x] fix(auth): usar el Client ID de OAuth propio en desarrollo y producción [11.1]
- [x] docs(readme): dominio de producción, orígenes de Google, capturas y revisión de zod [11.2]
