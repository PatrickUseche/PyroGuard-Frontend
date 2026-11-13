# Pruebas E2E (Playwright)

Corren contra el backend **local**; nunca contra producción.

1. Backend (carpeta `PyroGuard - BACKEND`), con SQLite y datos de ejemplo:

   ```bash
   export DATABASE_URL= DEBUG=True INGEST_API_KEY=e2e-ingest-key AI_SERVICE_URL= \
          THROTTLE_READ_RATE=100000/min THROTTLE_INGEST_RATE=100000/min
   python manage.py migrate && python manage.py seed_demo --reset --seed 1
   python manage.py runserver 8000
   ```

2. Dos usuarios con token de DRF (uno en el grupo «Operadores») y sus variables:
   `E2E_OPERATOR_TOKEN` y `E2E_VIEWER_TOKEN` (y `E2E_INGEST_API_KEY` si no usas `e2e-ingest-key`).
3. `npx playwright install chromium` y `npx playwright test` (levanta `ng serve` si no está corriendo).

El acceso con Google no se automatiza: las pruebas inyectan el token de DRF en `localStorage`.
Los nodos `SIM-00x` salen de `seed_demo`; vuelve a sembrar con `--reset` entre ejecuciones completas.
