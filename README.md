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
- `/login` — Acceso exclusivo con Google.
- `/registro` — Completa el registro de una cuenta nueva de Google eligiendo un nombre de usuario.

## Acceso con Google

La autenticación usa Google Identity Services en el navegador. Solo se aceptan cuentas `@gmail.com` verificadas por Google.

### Flujo de acceso y registro

1. En `/login`, selecciona **Continuar con Google**. Si la cuenta ya está registrada, se inicia sesión y se abre el dashboard (o la ruta protegida que se solicitó).
2. La primera vez que se verifica una cuenta, se abre `/registro`. Elige un nombre de usuario para terminar de crear la cuenta; no se crea hasta enviar ese nombre. Al completarse el registro, se inicia sesión y se abre el dashboard (o la ruta protegida solicitada).
3. Si cancelas el registro, puedes volver a verificar la cuenta de Google más tarde. La verificación pendiente se conserva solo en memoria y se pierde al recargar la página.

Los nombres de usuario deben tener entre 4 y 16 caracteres y usar solo letras, números, guion bajo (`_`), punto (`.`) o guion (`-`). Los nombres reservados y los ya utilizados no están disponibles; la comprobación final, sin distinguir mayúsculas, la realiza el backend.

Sin sesión, la interfaz permite únicamente `/login` y `/registro`; el resto de rutas, incluida una ruta desconocida, conduce al acceso. Una sesión activa es necesaria para usar el dashboard, nodos, mapa e historial de alertas.

La API permite lecturas públicas por defecto. Para exigir sesión también en las lecturas de la API, configura `PUBLIC_READ_ACCESS=False` en el `.env` local del backend y en las variables de entorno del servicio de backend en Render. El frontend adjunta automáticamente el token a las solicitudes de API; la ingesta de nodos no depende de esta opción.

### Configurar el Client ID

1. En Google Cloud Console, crea o selecciona un proyecto.
2. Configura la pantalla de consentimiento OAuth como **Externa** y deja la aplicación en modo de pruebas mientras se valida.
3. En **Usuarios de prueba**, añade cada cuenta que necesite iniciar sesión mientras la aplicación esté en pruebas.
4. Crea un ID de cliente OAuth de tipo **Aplicación web**.
5. En **Orígenes autorizados de JavaScript**, añade:
   - `http://localhost:4200`
   - El origen de producción de Vercel, sin barra final (por ejemplo, `https://pyroguard.vercel.app`).
6. Copia el **Client ID** a `googleClientId` en `src/environments/environment.development.ts` y `src/environments/environment.ts`. Configura el mismo valor en `GOOGLE_CLIENT_ID` en el backend.

El Client ID es público y queda incorporado al bundle del frontend. El **Client Secret no se usa en el navegador**: nunca lo pegues en `googleClientId`, en el código ni en el repositorio.

Las vistas previas de Vercel no admiten comodines en los orígenes OAuth autorizados. Google requiere autorizar cada origen exacto; las URL variables de las vistas previas normalmente no se pueden cubrir con un comodín. Usa el dominio de producción o registra manualmente un origen de vista previa estable si está disponible.

Mientras la pantalla de consentimiento esté en modo de pruebas, solo los usuarios añadidos a **Usuarios de prueba** podrán iniciar sesión.

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

`npm audit --omit=dev` reporta una vulnerabilidad alta en `zod@4.6.5` (GHSA-mrhx-c7xc-m3w5), relacionada con agotamiento de memoria al validar colecciones restringidas grandes. `npm update zod` no la resuelve dentro de los rangos semver declarados. En la revisión del 2026-11-02, `npm outdated` indicó `@angular/forms` actual `22.2.1` y wanted `22.2.4`; `npm update @angular/forms` terminó «up to date» sin cambiar el árbol instalado, y `npm audit --omit=dev` siguió reportando la vulnerabilidad. Las rutas observadas con `npm ls @angular/forms zod --all` son `@angular/forms@22.2.1 -> zod@4.6.5` y `@angular/cli@22.2.0 -> zod@4.6.5`. No se forzó una actualización mayor ni se ejecutó `npm audit fix --force`.
