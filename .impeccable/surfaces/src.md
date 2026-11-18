---
version: 1
slug: "src"
primary_target: "src"
related_targets: []
---

# Surface brief: PyroGuard frontend (src)

Mode: Operate. Audience: operadores de monitoreo forestal, escritorio + móvil. Task: leer el riesgo de un vistazo, localizar el nodo, actuar sobre alertas.
Constraints: Angular standalone, estilos inline, tokens en src/styles.css; rutas, filtros, login Google, sondeo 10 s, mapa Leaflet y pruebas se conservan. Español. Aviso de prototipo permanece.
Feeling: calma cuando todo es normal; alarma inequívoca en incendio.

## Direction contract

THESIS: El riesgo se lee como en un cartel de peligro de incendio de carretera: una escala de tres clases con puntero. Rechaza el panel de tarjetas de métricas idénticas con borde de color.
OWN-WORLD: Riel y cabecera verde conífera (#123b2e), fondo gris verdoso claro, tinta negra de señal, clases en esmalte saturado (verde #1f8a4c, ámbar #f2a900, rojo #d3302a); tipografía tipo señalización (Overpass) en mayúsculas para etiquetas y números grandes, system-ui para cuerpo; paneles planos con borde negro grueso, sin sombras difusas ni degradados.
STORY: El operador entiende en un segundo la clase de peligro global, ve qué nodo la causa y llega a su detalle; en incendio toda la cabecera adopta el campo rojo.
FIRST VIEWPORT: Riel lateral 240px (escritorio) / barra superior (móvil) con navegación; encima del contenido la banda-escala NORMAL | ADVERTENCIA | INCENDIO en bloque negro con puntero blanco sobre la clase actual; debajo cuatro cifras (nodos en línea, alertas activas, temp y humedad medias) y la rejilla de nodos, cada uno con una mini-escala de tres segmentos y muesca alta en su clase. Acción principal: abrir el nodo/alerta.
FORM: Fire-danger roadside rating sign, assigned candidate 4 of grounded list; seed:3545e5aff1812fa3. Signature move: banda-escala con puntero (global) repetida en miniatura por nodo; estado por forma (posición, muesca, trazo discontinuo=obsoleto, sello CERRADA), nunca solo color. Raises: emission-line rail (estado por forma), ticket wallet (sello en vez de desaparecer).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
