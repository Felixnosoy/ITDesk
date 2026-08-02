← [Volver al índice de la API](../06-api.md)

# Tickets — `/api/ticket`

La entidad central del sistema. Todas las rutas exigen sesión.

## `POST /api/ticket`

- **Rol**: Administrador, Tecnico, Recepcionista (**nunca Cliente** — coincide con la regla de negocio del proyecto: el cliente no crea sus propios tickets, siempre lo hace el staff tras un reporte presencial).
- **Descripción**: crea un ticket para un cliente y un equipo suyo.

### Body esperado

```json
{
  "id_usuario": 12,
  "id_equipo": 8,
  "titulo": "No enciende",
  "descripcion": "El equipo no enciende desde ayer, luz del cargador parpadea",
  "prioridad": "Alta",
  "categoria": "Hardware"
}
```

- `categoria` se valida contra `Hardware` / `Software` / `Red` / `Otro`.
- `prioridad` **no tiene validación de backend** (cualquier string pasa) — el frontend siempre usa `Alta`/`Media`/`Baja` por convención, no por enforcement.
- El equipo debe existir **y pertenecer exactamente a ese `id_usuario`** — si el equipo es de otro cliente, el mensaje de error es el mismo que si no existiera.
- El ticket nace siempre en estado `Abierto`.

### Respuesta exitosa (200)

```json
{
  "message": "Ticket creado exitosamente",
  "data": {
    "id_ticket": 45,
    "id_usuario": 12,
    "cliente": "Juan García",
    "id_equipo": 8,
    "equipo_tipo": "Laptop",
    "equipo_marca": "Dell",
    "equipo_modelo": "Inspiron 15",
    "equipo_numero_serie": "ABC123XYZ",
    "titulo": "No enciende",
    "descripcion": "El equipo no enciende desde ayer, luz del cargador parpadea",
    "prioridad": "Alta",
    "categoria": "Hardware",
    "estado": "Abierto",
    "fecha_apertura": "2026-08-01T10:00:00.000Z",
    "fecha_resolucion": null,
    "fecha_cierre": null
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | `Todos los campos obligatorios son requeridos.` |
| `400` | Mensaje listando las categorías válidas, si `categoria` no matchea |
| `404` | `El cliente no existe.` |
| `404` | `El equipo no existe o no pertenece a este cliente.` |

## `GET /api/ticket`

- **Rol**: Administrador, Tecnico, Recepcionista.
- **Descripción**: todos los tickets del sistema, con cliente y equipo ya incluidos (JOIN). **Sin filtrar por técnico asignado** — cualquier técnico ve todos los tickets (ver [08-roles.md](../08-roles.md)).
- **No acepta query params de filtrado** — el frontend filtra en memoria.

## `GET /api/ticket/usuario/:id_usuario`

- **Rol**: Administrador, Tecnico, Recepcionista.
- **Descripción**: tickets de un usuario puntual.
- **Error**: `404 "El cliente no existe."`

## `GET /api/ticket/mis`

- **Rol**: Cliente.
- **Descripción**: los tickets del cliente autenticado (`id_usuario` sale del JWT, reutiliza la misma función de arriba).

## `GET /api/ticket/:id`

- **Rol**: Administrador, Tecnico — **no incluye Recepcionista ni Cliente.** No existe ningún endpoint donde un Cliente pueda pedir el detalle completo de un ticket propio por id; solo tiene el listado `/mis`.
- **Error**: `404 "Ticket no encontrado"`.

## `PATCH /api/ticket/:id/cerrar`

- **Rol**: Administrador, Tecnico.
- **Descripción**: cierra el ticket directamente. **No exige ningún estado previo** — se puede cerrar un ticket "Abierto" sin pasar por "En proceso" ni "Resuelto".
- **Body**: ninguno.
- **Efecto**: `estado = "Cerrado"`, `fecha_cierre = ahora`.
- **Errores**: `404 "Ticket no encontrado"` / `409 "El ticket ya se encuentra cerrado."`.

## `PATCH /api/ticket/:id/estado`

- **Rol**: Administrador, Tecnico.
- **Descripción**: cambia el estado a `"En proceso"` o `"Resuelto"`.

### Body esperado

```json
{ "estado": "Resuelto" }
```

o, si el trabajo no tuvo costo:

```json
{ "estado": "Resuelto", "sin_costo": true, "motivo_sin_costo": "Se resolvió con un reinicio, sin repuestos ni horas facturables" }
```

### Gate de negocio central del sistema

Un ticket **no puede pasar a `Resuelto`** salvo que exista una cotización `Aprobada` con una factura vigente (no `Anulada`) asociada — la verificación toma la línea de `detalle_cotizacion` más reciente del ticket. Si no se cumple:

- sin `sin_costo`: `409 "No se puede marcar el ticket como Resuelto sin una cotización aprobada y facturada. Si no requiere cargo, indícalo explícitamente."`
- con `sin_costo: true` pero sin `motivo_sin_costo`: `400 "Debes indicar un motivo para cerrar el ticket sin costo."`

Al pasar a "Resuelto" se setea `fecha_resolucion = ahora`; al volver a "En proceso" se limpia a `NULL`. `fecha_cierre` nunca se toca acá.

### Errores

| Status | Mensaje |
|---|---|
| `400` | Estado inválido (solo se acepta `En proceso` o `Resuelto`) / falta motivo sin costo |
| `404` | `Ticket no encontrado` |
| `409` | `El ticket ya está cerrado y no puede cambiar de estado.` / falta cotización-factura (ver arriba) |
