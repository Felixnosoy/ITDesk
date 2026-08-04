# 10. Componentes importantes del frontend

Frontend HTML/CSS/JS "vanilla", sin build ni framework. Bootstrap 5.3.7 + Bootstrap Icons 1.13.1 vía CDN, Chart.js 4 vía CDN (solo en `reporte-estadisticas.html`). **27 páginas HTML, 35 scripts JS.** Ver la lista completa de páginas por rol en [08-roles.md](08-roles.md); este capítulo se centra en cómo funciona cada pieza y cómo se conecta a la API.

## Infraestructura compartida

Estos 8 scripts son la base de la que depende casi toda pantalla protegida — se cargan antes que el script propio de cada página.

### `js/api.js`
Expone `apiFetch(endpoint, opciones)`, el único punto de salida hacia la red en todo el frontend. Arma la URL contra `API_URL = "http://localhost:3000/api"` (constante hardcodeada, no configurable por variable de entorno — ver [04-instalacion.md](04-instalacion.md)), agrega `Authorization: Bearer <token>` si hay sesión, y si el body es `FormData` no fuerza `Content-Type` (para no romper la subida `multipart/form-data` de archivos). Traduce el contrato `{ success, message, data }`: devuelve `data` si `success`, o lanza `Error(message)` si no. Un `401` fuera de `/auth/login` dispara logout automático global.

### `js/auth.js`
Objeto `Auth` — sesión en `sessionStorage` (no `localStorage`, a propósito: sesión distinta por pestaña). Ver el detalle completo en [07-autenticacion.md](07-autenticacion.md).

### `js/ui.js`
Helpers de presentación puros, sin dependencia de `api.js`/`Auth`, usados en las pantallas protegidas:
- `badgeEstado` / `badgePrioridad` / `badgeCategoria` / `badgeEstadoUsuario` / `badgeEstadoEquipo` / `badgeEstadoVisita` / `badgeRol` / `badgeTipoNotificacion` — badges con tono semántico según mapas fijos.
- `formatearFecha` / `formatearFechaCorta` / `formatearPorcentaje` — formato `es-DO`, interpretan la fecha en huso horario **local** (correcto para columnas `DATETIME` con hora real).
- `formatearFechaSolo(valor)` — igual pero para columnas `DATE` sin hora (ej. `visita_tecnica.fecha_solicitada`): ancla todo en UTC de punta a punta para no correr el día mostrado según el huso horario del navegador. **No usar `formatearFecha`/`formatearFechaCorta` para un valor `DATE`** — fue un bug real, corregido durante el desarrollo del módulo de visitas técnicas.
- `renderSkeleton` / `renderEmptyState` / `renderErrorRow` — estados de carga/vacío/error para tablas.
- `paginarRender(listaOrdenada, renderFn, contenedorBoton, opciones)` — paginación 100% client-side, ya que la API no soporta `LIMIT`/`OFFSET`.
- `renderTimeline` — pinta el timeline público/privado de un ticket.
- `renderAdjunto` / `mostrarImagen` — placeholder + lightbox para archivos adjuntos.
- `confirmar` / `pedirTexto` — reemplazos de `confirm()`/`prompt()` nativos con modal de Bootstrap (devuelven `Promise`). **`pedirTexto` exige texto no vacío** (bloquea el submit con `.is-invalid` si el campo queda en blanco) — no sirve para pedir un dato realmente opcional; para eso, usar `confirmar` sin campo de texto.
- `toast` — aviso no bloqueante.
- `conCargando(boton, textoCargando, fn)` — patrón disable+spinner+restaurar para botones de formulario.
- `contarHasta(elemento, valorFinal, opciones)` — animación *count-up* para KPIs, respeta `prefers-reduced-motion`.

### `js/layout.js`
Arma el shell de la app (sidebar + topbar + footer) según el rol y protege la página vía `Layout.init()` (disparado en `DOMContentLoaded`):
- `NAV_POR_ROL` — links de sidebar por rol (incluye un grupo colapsable "Reportes" solo para Administrador).
- `Theme` — toggle de modo oscuro/claro, persistido en `localStorage["tema"]`.
- Sistema de notificaciones (campanita): *polling* cada 45 segundos (no hay websockets en el proyecto), panel adjuntado a `document.body` para escapar el `overflow` del sidebar.
- Buscador global en la topbar de escritorio: typeahead sobre tickets, cacheado perezosamente. Cliente no lo tiene — en su lugar, un botón "Solicitar soporte" con modal informativo (no puede crear tickets).
- Modo embebido (`?embed=1`): salta sidebar/topbar/footer pero la autenticación sigue corriendo — usado por el iframe de detalle en `dashboard-tecnico.html`.

### `js/search.js`
Buscador client-side genérico (`filtrar(lista, termino, campos)`, `conectar(inputEl, onBuscar, idAriaLive, espera)`), ya que la API no acepta filtros por query param.

### `js/ordenar.js`
Ordenamiento client-side de tablas conectado a `<th data-sort="campo">` — un click ordena ascendente, un segundo invierte. Usado en 6 pantallas: `auditoria.html`, `dashboard-admin.html`, `dashboard-cliente.html`, `documentos.html`, `historial.html`, `usuarios.html`.

### `js/codigos.js`
Arma identificadores legibles (`TCK-2026-000037`, etc.) a partir del id autoincremental + una fecha del mismo objeto, sin pedir nada nuevo al backend. Una función por entidad: `ticket`, `factura`, `cotizacion`, `cliente`, `equipo`, más `reporte(prefijo)` para encabezados de documentos impresos.

### `js/imprimir.js`
Renderiza documentos imprimibles dentro de `#areaImprimir` (oculto en pantalla, visible solo bajo `@media print`) y dispara `window.print()`. No genera PDF en servidor ni usa librerías nuevas — "Guardar como PDF" del diálogo de impresión del navegador es el export real. Una función por tipo de documento: `documento()` (factura/cotización individual), 7 funciones `reporte*()` (una por cada reporte tabular), y `recepcionEquipo()` (comprobante de recepción, sin montos).

## Componentes por área funcional

### Dashboard (una pantalla distinta por rol, sin código compartido entre ellas)

- **`dashboard-cliente.html` (`cliente.js`)**: sección destacada con el ticket activo más reciente (rail de pasos Recibido/En reparación/Listo + última novedad), 3 mini-stats, tarjetas con todos los tickets activos.
- **`dashboard-tecnico.html` (`tecnico.js`)**: cola de trabajo con 2 vistas — Lista (maestro-detalle, con el detalle embebido vía iframe de `detalle-ticket.html?embed=1`) y Kanban (drag-and-drop nativo por estado). Incluye el panel de filtros combinables (offcanvas de Bootstrap, ver más abajo) y stats de "mi rendimiento" personal.
- **`dashboard-admin.html` (`admin.js`)**: 4 KPI reales con animación *count-up* (Tickets Registrados, Clientes Activos, Técnicos Especializados, % Resueltos), tabla de tickets con asignación de técnico, actividad reciente. Se refresca por *polling* cada 60 segundos.
- **`dashboard-recepcion.html` (`dashboard-recepcion.js`)**: métricas del día, consulta rápida de ticket (typeahead), directorio de clientes con ficha de equipos+tickets.

### Tickets

- **`detalle-ticket.html` (`ticket-tecnico.js`, ~1200 líneas, el script más grande del proyecto)**: centro de trabajo del ticket para Técnico/Administrador — pestañas Actividad (log público)/Diagnóstico/Notas privadas, cotizar, generar factura, cerrar ticket. Incluye pegar capturas de pantalla con Ctrl+V como adjunto.
- **`ticket-cliente.html` (`ticket-cliente.js`)**: la vista del cliente sobre su propio ticket — info de equipo, timeline público, cotización con Aprobar/Rechazar si está `Pendiente`, encuesta de satisfacción si el ticket está `Cerrado`. Deliberadamente **no comparte código** con `ticket-tecnico.js` (carga de adjuntos, formato de timeline) — se mantiene independiente a propósito.
- **`recepcion.html` (`recepcion.js`)**: wizard de 3 pasos (buscar/crear cliente → elegir/crear equipo → crear ticket), con atajos de teclado Alt+1/2/3 y comprobante imprimible.

### Visitas técnicas

- **`agendar-visita.html` (`agendar-visita.js`)**: formulario del Cliente — especialidad (catálogo), fecha (`<input type="date">`), hora libre (`<input type="time">`) con un aviso informativo de horarios ya ocupados ese día por especialidad (`GET /visita-tecnica/disponibilidad`), dirección, motivo.
- **`mis-visitas.html` (`mis-visitas.js`)**: listado del Cliente de sus propias visitas con `UI.badgeEstadoVisita` y cancelar mientras siga `Pendiente`/`Confirmada`.
- **`agenda-visitas.html` (`agenda-visitas.js`)**: calendario de Recepción/Administrador — vistas Mes/Semana/Día hechas a mano con CSS grid (sin librería de terceros), panel de "próximas visitas", y un modal con las acciones completas (confirmar con técnico+equipo del cliente, reprogramar, reasignar técnico, cancelar). Todas las fechas se manejan ancladas en UTC de punta a punta (nunca `new Date(iso)` con getters locales) para no correr el día mostrado según el huso horario del navegador.
- **`mis-visitas-tecnico.html` (`mis-visitas-tecnico.js`)**: cola de visitas asignadas al Técnico, con botón para avanzar de estado (`Confirmada` → `En camino` → `En progreso` → `Finalizada`), botón aparte para dejar una observación sin cambiar de estado, y enlace directo al ticket vinculado para cargar el diagnóstico.

### Usuarios

- **`usuarios.html` (`admin.js`)**: CRUD completo — crear, activar/desactivar, resetear contraseña, eliminar (solo Administrador y Recepcionista pueden acceder a la creación, según el mismo control de rol que el backend).
- **`perfil.html` (`perfil.js`, compartida por los 4 roles)**: autoedición de datos propios (teléfono/dirección) y cambio de contraseña propia.

### Equipos

No tiene una pantalla dedicada de gestión independiente — los equipos se crean como parte del wizard de `recepcion.html`, se editan desde `detalle-ticket.html`, y se listan/consultan desde `reporte-equipos.html` (Administrador).

### Reportes (exclusivo de Administrador)

`reportes.html` es el índice (4 KPI + grilla de 8 accesos). Los 8 reportes: `reporte-tickets.html`, `reporte-rendimiento.html`, `reporte-notificaciones.html`, `reporte-resueltos.html`, `reporte-equipos.html`, `reporte-facturas.html`, `reporte-clientes.html`, `reporte-estadisticas.html` (el único con gráficos, vía Chart.js). Todos (salvo estadísticas) siguen el mismo *pipeline*: cargar datos en memoria → poblar selects de filtro → filtrar + paginar → imprimir. Comparten 2 helpers en `js/reportes-comun.js` (`formatearFechaInputCorta`, `metaImpresion`).

### Login

`login.html` (`js/script.js`) — el único script del proyecto con un nombre que no sigue la convención `<pantalla>.js` (inconsistencia de nomenclatura heredada, no un bug). Llama `POST /auth/login`, guarda la sesión, redirige según el rol. Muestra un aviso si la llegada fue por sesión expirada o acceso sin permiso (leído de `sessionStorage.motivoLogout`, dejado ahí por `Auth.cerrarPorSesionVencida()` o `Auth.requerirRol()`).

## Sistema de diseño

`css/tokens.css` es la fuente única de verdad de color/tipografía/espaciado/radios/elevación — organizado en primitivos → semánticos → alias heredados, como *custom properties* CSS. `css/style.css` (~40 bloques temáticos: cards, tablas, badges, kanban, timeline, impresión, etc.) consume esas variables, sin valores de color sueltos fuera de `tokens.css`.

- **Modo oscuro/claro**: se activa por `prefers-color-scheme` o por un toggle manual (`[data-theme="dark"|"light"]`, que siempre gana sobre la preferencia del sistema).
- **Identidad visual por rol**: cada rol tiene su propio bloque `[data-rol="cliente|tecnico|admin|recepcion"]` (atributo puesto en `<body>` por `Layout.init()`) que redefine acento de color, radios de borde y densidad — Cliente con paleta celeste/turquesa y radios grandes (sigue el tema claro/oscuro como cualquier producto de consumo), Técnico con sidebar casi negro fijo y acento cian (radios chicos, fila más baja, pensado para densidad de cola de trabajo), Administrador con acento índigo/violeta y el layout más ancho (para tablas de reportes), Recepcionista comparte la paleta de Administrador (sin identidad propia asignada).

## Mapa completo pantalla → endpoints de API

| Pantalla / script | Endpoints que consume |
|---|---|
| `login.html` (script.js) | `POST /auth/login` |
| `index.html` (landing.js) | `GET /estadisticas/publicas` |
| `perfil.html` (perfil.js) | `GET/PATCH /usuarios/:id`, `PATCH /usuarios/:id/perfil`, `PATCH /usuarios/:id/clave` |
| `dashboard-cliente.html` (cliente.js) | `GET /ticket/mis`, `GET /actualizacion/notas/:id` |
| `historial.html` (historial.js) | `GET /ticket/mis` |
| `documentos.html` (documentos.js) | `GET /cotizacion/mis(/:id)`, `GET /factura/mis(/:id)`, `GET /ticket/mis`, `GET /usuarios/:id` |
| `ticket-cliente.html` (ticket-cliente.js) | `GET /ticket/mis`, `GET /actualizacion/notas/:id`, `GET /archivos/mis/ticket/:id`, `GET /archivos/:id/descargar`, `GET/PATCH /detalle-cotizacion/mis/ticket/:id`, `GET/PATCH /cotizacion/mis/:id(/estado)`, `GET/POST /encuestas(/mis/ticket/:id)` |
| `agendar-visita.html` (agendar-visita.js) | `GET /especialidad`, `GET /visita-tecnica/disponibilidad`, `POST /visita-tecnica` |
| `mis-visitas.html` (mis-visitas.js) | `GET /visita-tecnica/mis`, `PATCH /visita-tecnica/:id/cancelar` |
| `dashboard-tecnico.html` (tecnico.js) | `GET /ticket`, `GET /asignacion`, `GET /equipo`, `PATCH /ticket/:id/estado`, `PATCH /ticket/:id/cerrar`, `POST /notificacion` |
| `detalle-ticket.html` (ticket-tecnico.js) | `GET /ticket/:id`, `GET /usuarios/:id`, `GET /actualizacion/ticket/:id`, `POST /actualizacion`, `PUT /actualizacion/:id`, `GET /diagnostico/ticket/:id`, `POST /diagnostico`, `PUT /diagnostico/:id`, `GET /equipo/:id`, `PUT /equipo/:id`, `GET /archivos/ticket/:id`, `POST /archivos`, `DELETE /archivos/:id`, `GET /archivos/:id/descargar`, `GET/POST /notas`, `GET /notas/ticket/:id`, `GET /detalle-cotizacion/ticket/:id`, `GET/POST /cotizacion`, `GET /cotizacion/usuario/:id`, `PATCH /cotizacion/:id/descuento`, `GET /detalle-factura/ticket/:id`, `GET/POST /factura`, `PATCH /factura/:id/estado`, `GET /asignacion/ticket/:id`, `GET /encuestas/ticket/:id`, `PATCH /ticket/:id/estado`, `PATCH /ticket/:id/cerrar`, `POST /notificacion` |
| `mis-visitas-tecnico.html` (mis-visitas-tecnico.js) | `GET /visita-tecnica/tecnico/mis`, `PATCH /visita-tecnica/:id/estado` |
| `dashboard-admin.html` + `usuarios.html` (admin.js) | `GET /usuarios`, `POST /usuarios`, `DELETE /usuarios/:id`, `PATCH /usuarios/:id/estado`, `PATCH /usuarios/:id/clave/reset`, `GET/PUT /usuarios/:id/especialidades`, `GET /especialidad`, `GET /asignacion`, `POST /asignacion`, `PUT /asignacion/:id`, `GET /ticket`, `PATCH /ticket/:id/estado`, `GET /equipo`, `POST /notificacion` |
| `agenda-visitas.html` (agenda-visitas.js) | `GET /visita-tecnica`, `GET /visita-tecnica/disponibilidad`, `GET /equipo/usuario/:id`, `PATCH /visita-tecnica/:id/confirmar`, `PATCH /visita-tecnica/:id/reprogramar`, `PATCH /visita-tecnica/:id/asignar`, `PATCH /visita-tecnica/:id/cancelar` |
| `auditoria.html` (auditoria.js) | `GET /auditoria` |
| `recepcion.html` (recepcion.js) | `GET /usuarios`, `POST /usuarios`, `POST /equipo`, `GET /equipo/usuario/:id`, `POST /ticket`, `POST /notificacion` |
| `dashboard-recepcion.html` (dashboard-recepcion.js) | `GET /ticket`, `GET /usuarios`, `GET /equipo` |
| `reportes.html` (reportes.js) | `GET /ticket`, `GET /encuestas` |
| `reporte-tickets.html` / `reporte-rendimiento.html` | `GET /ticket`, `GET /usuarios`, `GET /asignacion` |
| `reporte-resueltos.html` | `GET /ticket`, `GET /usuarios`, `GET /asignacion`, `GET /encuestas` |
| `reporte-equipos.html` | `GET /equipo` |
| `reporte-facturas.html` | `GET /factura`, `GET /detalle-factura`, `GET /ticket`, `GET /usuarios` |
| `reporte-clientes.html` | `GET /usuarios`, `GET /ticket` |
| `reporte-notificaciones.html` | `GET /notificacion`, `GET /ticket` |
| `reporte-estadisticas.html` | `GET /ticket`, `GET /usuarios`, `GET /encuestas` |
| `js/layout.js` (todas las páginas protegidas) | `GET /notificacion/mis`, `PATCH /notificacion/mis/:id/leida`, `PATCH /notificacion/mis/leidas`, `GET /ticket/mis` (Cliente) o `GET /ticket` + `GET /usuarios` (resto), para el buscador global |

Todos los endpoints de esta tabla fueron verificados contra `backend/src/routes/*.js` — no se encontró ninguna llamada del frontend a un endpoint que no exista del lado del backend.
