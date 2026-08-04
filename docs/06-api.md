# 6. API

La API REST vive bajo el prefijo `/api` (por ejemplo, `http://localhost:3000/api/ticket`), organizada en **18 recursos** y **99 endpoints** en total. Este archivo cubre las convenciones comunes a todos ellos; el detalle endpoint por endpoint está en [`docs/api/`](api/), un archivo por recurso.

## Convenciones comunes

### Formato de respuesta

Toda respuesta, exitosa o de error, sigue el mismo contrato:

```json
{ "success": true, "message": "...", "data": { } }
```

```json
{ "success": false, "message": "Mensaje de error legible" }
```

- `data` puede ser un objeto, un array, o estar ausente (algunos endpoints solo devuelven `message`, por ejemplo al cambiar una contraseña).
- `message` en una respuesta exitosa es opcional/informativo; en una respuesta de error siempre está presente y es el texto que el frontend muestra tal cual.
- El frontend consume este contrato a través de un único wrapper, `apiFetch` (`frontend/js/api.js`): si `success` es `true` devuelve `data`; si es `false`, lanza `Error(message)`.

### Autenticación

Todas las rutas exigen un header `Authorization: Bearer <token>`, **excepto exactamente 2 endpoints en todo el backend**: `POST /api/auth/login` (obviamente, es el que emite el token) y `GET /api/estadisticas/publicas` (para la landing pública sin sesión). El detalle completo del flujo de login y del middleware está en [07-autenticacion.md](07-autenticacion.md).

### Autorización por rol

La mayoría de las rutas exigen además que el rol del token esté en una lista permitida (middleware `verificarRol(...)`). Algunos endpoints solo exigen sesión válida y validan la propiedad del recurso (*ownership*) dentro del controller/service — por ejemplo, un usuario cambiando su propia contraseña. Ver el detalle de qué rol puede qué en [08-roles.md](08-roles.md) y en cada archivo de `docs/api/`.

### Errores

No hay un middleware de manejo de errores global (ver [14-problemas-conocidos.md](14-problemas-conocidos.md)) — cada controller tiene su propio `try/catch`. Los códigos HTTP usados en todo el sistema:

| Código | Significado en este proyecto |
|---|---|
| `400` | Datos de entrada inválidos o incompletos |
| `401` | Token ausente, mal formado, inválido o expirado; o credenciales de login incorrectas |
| `403` | Autenticado pero sin permiso sobre este recurso puntual (rol insuficiente, o no es el dueño) |
| `404` | El recurso solicitado no existe |
| `409` | Conflicto con el estado actual del recurso (por ejemplo, un ticket ya cerrado, una cotización ya no editable, un correo ya registrado) |
| `500` | Error no controlado (falla de base de datos, excepción no prevista) |

> Nota: `usuario.service.js` usa `409` en vez de `404` para "usuario no encontrado" en dos de sus funciones — es una inconsistencia real del código, no un patrón a replicar. Ver [14-problemas-conocidos.md](14-problemas-conocidos.md).

### Filtrado, orden y paginación

**Ningún endpoint `GET` acepta query params de filtrado.** Todo el filtrado, ordenamiento y paginación del sistema ocurre en el frontend, sobre el array completo ya traído del backend (`Search`, `Ordenar`, `UI.paginarRender` en `frontend/js/`). Esto es deliberado y consistente en las 23 pantallas — no es una limitación de un endpoint puntual, aplica a toda la API.

### Recursos "mis..." (alcance del cliente)

Varios recursos exponen una variante bajo `/mis` o `/mis/...` pensada para el rol Cliente: el `id_usuario` se toma siempre del JWT (`req.usuario.id_usuario`), nunca de un parámetro de la URL ni del body — así un cliente nunca puede pedir datos de otro cliente cambiando un id en la URL.

## Índice de recursos

| Recurso | Prefijo | Endpoints | Archivo |
|---|---|---|---|
| Salud del sistema | `/api/health` | 1 | [api/health.md](api/health.md) |
| Autenticación | `/api/auth` | 1 | [api/auth.md](api/auth.md) |
| Usuarios | `/api/usuarios` | 11 | [api/usuarios.md](api/usuarios.md) |
| Equipos | `/api/equipo` | 6 | [api/equipo.md](api/equipo.md) |
| Tickets | `/api/ticket` | 7 | [api/ticket.md](api/ticket.md) |
| Asignaciones | `/api/asignacion` | 7 | [api/asignacion.md](api/asignacion.md) |
| Diagnósticos | `/api/diagnostico` | 7 | [api/diagnostico.md](api/diagnostico.md) |
| Actualizaciones (log público) | `/api/actualizacion` | 8 | [api/actualizacion.md](api/actualizacion.md) |
| Cotizaciones | `/api/cotizacion` | 10 | [api/cotizacion.md](api/cotizacion.md) |
| Detalle de cotización | `/api/detalle-cotizacion` | 8 | [api/detalle-cotizacion.md](api/detalle-cotizacion.md) |
| Facturas | `/api/factura` | 9 | [api/factura.md](api/factura.md) |
| Detalle de factura | `/api/detalle-factura` | 4 | [api/detalle-factura.md](api/detalle-factura.md) |
| Notificaciones | `/api/notificacion` | 9 | [api/notificacion.md](api/notificacion.md) |
| Archivos adjuntos | `/api/archivos` | 5 | [api/archivos.md](api/archivos.md) |
| Notas privadas | `/api/notas` | 2 | [api/notas.md](api/notas.md) |
| Auditoría | `/api/auditoria` | 1 | [api/auditoria.md](api/auditoria.md) |
| Encuestas de satisfacción | `/api/encuestas` | 4 | [api/encuestas.md](api/encuestas.md) |
| Estadísticas públicas | `/api/estadisticas` | 1 | [api/estadisticas.md](api/estadisticas.md) |
| Especialidades técnicas | `/api/especialidad` | 4 | [api/especialidad.md](api/especialidad.md) |
| Visitas técnicas | `/api/visita-tecnica` | 11 | [api/visita-tecnica.md](api/visita-tecnica.md) |

**Total: 116 endpoints**, todos verificados contra el código fuente real de `backend/src/routes/*.js`.

## Reglas de negocio transversales

Estas reglas atraviesan más de un recurso y conviene tenerlas presentes al leer el detalle de cada uno (están repetidas en el archivo del recurso donde aplican, para no obligar a saltar entre documentos):

1. **Gate de "Resuelto"**: un ticket no puede pasar a `Resuelto` sin una cotización `Aprobada` con factura vigente — salvo excepción explícita "sin costo" con motivo. Ver [api/ticket.md](api/ticket.md).
2. **Diagnóstico antes que cotización**: no se puede cotizar un ticket sin diagnóstico previo. Ver [api/detalle-cotizacion.md](api/detalle-cotizacion.md).
3. **Aprobar/rechazar cotización es del cliente, no del técnico**: el endpoint de staff para cambiar estado de cotización está limitado a Administrador; el técnico no puede aprobar ni rechazar. Ver [api/cotizacion.md](api/cotizacion.md).
4. **Factura = snapshot 1:1 de una cotización aprobada**, no se recalcula después. Ver [api/factura.md](api/factura.md).
5. **Auditoría nunca rompe la acción principal**: si falla el registro de auditoría, la operación de negocio igual se considera exitosa. Ver [api/auditoria.md](api/auditoria.md).
6. **Notificaciones nunca se disparan automáticamente**: siempre nacen de un `POST /api/notificacion` explícito. Ver [api/notificacion.md](api/notificacion.md).
7. **El cliente nunca crea un ticket directamente, ni siquiera al solicitar una visita técnica**: el ticket nace recién cuando Recepción/Administrador confirma la visita (se crea uno nuevo o se vincula uno existente del cliente) — la regla original de "solo staff crea tickets" se mantiene intacta. Ver [api/visita-tecnica.md](api/visita-tecnica.md).

Un catálogo más completo de reglas de negocio no obvias (una por cada matiz encontrado en el código) está distribuido entre los archivos de `docs/api/`, agrupado en el recurso donde vive la regla.
