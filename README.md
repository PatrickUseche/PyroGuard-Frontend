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

## Estructura

```text
src/app/
  core/       configuración, interceptores, servicios y layout
  features/   dashboard, alertas, lecturas, nodos y autenticación
  shared/     modelos, componentes e utilidades compartidos
src/environments/  URLs de API para desarrollo y producción
```

La aplicación usa Angular standalone, rutas con carga perezosa y modo SPA; no incluye renderizado del lado del servidor.

## Despliegue en Vercel

`vercel.json` configura el build con `npm run build`, publica `dist/pyro-guard-frontend/browser`, conserva el rewrite de SPA y añade cabeceras de seguridad y caché de larga duración para assets con hash. La URL de producción se toma de `src/environments/environment.ts` en el build; no se configura mediante variables de entorno de Vercel. Después de cambiar esa URL, genera y despliega un nuevo build.
