# PyroGuard Frontend

Panel web de monitoreo forestal para visualizar nodos, lecturas de sensores y alertas de PyroGuard. La interfaz consume la API de PyroGuard-Backend; no ejecuta inferencia de IA en el navegador.

> Prototipo académico con datos sintéticos; no es un detector certificado de incendios.

## Requisitos

- Node.js compatible con Angular CLI 22 (Node.js 22.22.3 o posterior de la rama 22, o 24.15.0 o posterior de la rama 24).
- npm 8 o posterior. El proyecto fija npm 11.17.0 en `package.json`.
- PyroGuard-Backend disponible localmente o en Render para obtener datos reales. La aplicación puede iniciarse sin la API, pero mostrará los estados de error o desconocido correspondientes.

## Instalación y desarrollo

Desde la carpeta del frontend:

```bash
npm ci
npm start
```

Abre `http://localhost:4200/`. Angular recarga los cambios automáticamente.

### Elegir el backend

La URL se incorpora al bundle durante la compilación:

- `npm start` usa `src/environments/environment.development.ts`. Por defecto apunta a `http://localhost:8000/api`.
- `npm run build` usa `src/environments/environment.ts` y apunta a `https://pyroguard-backend.onrender.com/api`.

Para desarrollar contra Render, cambia `apiUrl` en `src/environments/environment.development.ts` a la URL de Render y reinicia el servidor de desarrollo. Para cambiar el destino de producción, actualiza `src/environments/environment.ts` y vuelve a compilar.

La URL de la API no es un secreto. Vercel no la inyecta en tiempo de ejecución: las variables de entorno de Vercel no cambian el `environment` de Angular. Cualquier cambio de URL requiere un nuevo build.

## Comandos

```bash
npm start              # servidor local de desarrollo
npm run build          # build optimizado de producción
npx ng test --watch=false  # suite Vitest una sola vez
```

La salida de producción está en `dist/pyro-guard-frontend/browser`.

## Pantallas

- `/` — Resumen global de riesgo y métricas; estado de los nodos, alertas activas, lecturas recientes y gráfico histórico de temperatura, humedad y humo.
- `/nodos/:id` — Estado de conexión y riesgo del nodo, última lectura, alertas activas y su gráfico histórico.
- `/alertas` — Historial paginado con filtros por estado, nivel y nodo. Reconocer o cerrar alertas requiere iniciar sesión.
- `/login` — Inicio de sesión en el backend. La lectura del dashboard es pública; la sesión habilita las acciones de alertas.

El dashboard actualiza el resumen, los nodos y las alertas activas cada 10 segundos; el sondeo se pausa cuando la pestaña está oculta. La tabla de lecturas y los gráficos consultan bajo demanda y se actualizan como máximo cada 30 segundos. Las respuestas HTTP 429 se gestionan respetando `Retry-After`.

## Capturas

Pendiente de capturas reales: no se generaron imágenes porque el backend local con datos no estaba disponible. Cuando se ejecute localmente, guardar capturas a 1280 px y 360 px en:

- `docs/capturas/dashboard-1280.png` y `docs/capturas/dashboard-360.png`
- `docs/capturas/detalle-nodo-1280.png` y `docs/capturas/detalle-nodo-360.png`
- `docs/capturas/alertas-1280.png` y `docs/capturas/alertas-360.png`
- `docs/capturas/mapa-1280.png` y `docs/capturas/mapa-360.png`

## Probar el flujo con el simulador IoT

Este flujo es local y usa el backend de desarrollo en `http://localhost:8000/api`; no envía datos a producción.

1. En una terminal, desde la raíz de `PyroGuard-Backend`, prepara el entorno según su README:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

2. Edita el `.env` local y configura `DEBUG=True`, `DATABASE_URL=` (vacía) y `AUTO_REGISTER_NODES=True`. Las demás variables deben seguir la guía de desarrollo del README del backend. Aplica las migraciones e inicia la API:

   ```powershell
   python manage.py migrate
   python manage.py runserver
   ```

3. En otra terminal, desde la misma raíz del backend y con su entorno Python activo, inicia una de estas simulaciones. El backend admite los escenarios `random`, `warning` y `fire`; el intervalo está expresado en segundos:

   ```powershell
   python simulador_iot.py --node SIM-001 --scenario random --interval 3
   python simulador_iot.py --node SIM-001 --scenario warning --interval 3
   python simulador_iot.py --node SIM-001 --scenario fire --interval 3
   ```

   Pulsa `Ctrl+C` para detener el simulador.

4. Inicia el frontend con `npm start` y abre `http://localhost:4200/`. El nodo `SIM-001` debe aparecer como «Simulado» en la rejilla, el mapa y las vistas que muestran ese nodo; las lecturas nuevas deben reflejarse en el dashboard y en el historial. `random` elige categorías con pesos 85/10/5; las alertas dependen de la clasificación final y de la configuración de alertas del backend.

## Estructura

```text
src/app/
  core/       configuración, interceptores, servicios y layout
  features/   dashboard, alertas, lecturas, nodos y autenticación
  shared/     modelos, componentes e utilidades compartidos
src/environments/  URLs de API para desarrollo y producción
```

La aplicación usa Angular standalone, rutas con carga perezosa y modo SPA; no incluye renderizado del lado del servidor.

## Compatibilidad de navegadores

El proyecto no declara un `.browserslistrc` ni una lista propia en `package.json`. Angular 22 usa su política predeterminada `baseline widely available` (la versión instalada de `@angular/build` resuelve la fecha de baseline `2026-05-07`), que incluye Chrome, Edge, Firefox, Safari, iOS Safari, Android Chrome y Android Firefox. La política efectiva se puede revisar en `node_modules/@angular/build/src/utils/supported-browsers.js` y consultar con Browserslist desde la raíz del frontend.

## Despliegue en Vercel

1. Importa el repositorio en Vercel y deja como raíz del proyecto la carpeta que contiene este `package.json` y `vercel.json`.
2. Usa el comando de build `npm run build` y el directorio de salida `dist/pyro-guard-frontend/browser`; ambos están configurados en `vercel.json`. El archivo también establece el rewrite necesario para la SPA y las cabeceras de seguridad y caché.
3. Antes de compilar, comprueba `apiUrl` en `src/environments/environment.ts`. Angular incorpora ese valor al bundle durante el build; las variables de entorno de Vercel no lo reemplazan en runtime. Si cambia el destino de API, actualiza el archivo y genera un despliegue nuevo.
4. Verifica CORS en el backend, en `config/settings.py`: `CORS_ALLOWED_ORIGINS` incluye los orígenes locales y de Vercel conocidos, `CORS_ALLOWED_ORIGIN_REGEXES` admite los subdominios `*.vercel.app`, y `EXTRA_CORS_ORIGINS` permite añadir otros orígenes desde la configuración del backend. Ese mismo archivo define las cabeceras expuestas `X-Total-Count` y `Retry-After`.

## Seguridad

`npm audit --omit=dev` reporta una vulnerabilidad alta en `zod@4.6.5` (GHSA-mrhx-c7xc-m3w5), relacionada con agotamiento de memoria al validar colecciones restringidas grandes. `npm update zod` no la resuelve dentro de los rangos semver declarados; no se forzó una actualización mayor. La ruta de dependencia de producción es `@angular/forms@22.2.1 -> zod@4.6.5` (`npm ls zod --all` también muestra una ruta de desarrollo desde `@angular/cli`).
