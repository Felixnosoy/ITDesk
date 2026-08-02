← [Volver al índice de la API](../06-api.md)

# Actualizaciones (log público) — `/api/actualizacion`

Bitácora pública del ticket: cada fila es una entrada de log con un `estado` y una observación opcional. **Este módulo solo inserta filas de historial — no cambia el `estado` real del ticket**, eso ocurre en los endpoints dedicados de `ticket` (`/cerrar`, `/estado`, ver [api/ticket.md](ticket.md)). Es el equivalente al log público, distinto de `nota_privada` (interno). Todas las rutas exigen sesión.

## `POST /api/actualizacion`

- **Rol**: Administrador, Tecnico.
- **Descripción**: agrega una entrada al historial del ticket.

### Body esperado

```json
{
  "id_ticket": 45,
  "id_usuario": 4,
  "estado": "En proceso",
  "observaciones": "Se solicitó la fuente de poder de repuesto al proveedor"
}
```

`estado` se valida contra `Abierto`/`En proceso`/`Resuelto`/`Cerrado`. `observaciones` es opcional — si se omite, la entrada **no será visible para el cliente** (ver `GET /notas/:id_ticket` más abajo).

> ⚠️ **`id_usuario` se toma del `body`, no del JWT** en este endpoint — a diferencia de `nota_privada` (`POST /api/notas`), que sí toma el autor del token. Es una inconsistencia de diseño reconocida en un comentario del propio código. Quien llame a este endpoint debe enviar explícitamente el id del staff autor.

### Respuesta exitosa (200)

```json
{
  "message": "Actualización registrada exitosamente",
  "data": {
    "id_actualizacion": 100,
    "id_ticket": 45,
    "id_usuario": 4,
    "usuario": "Ana Pérez",
    "estado": "En proceso",
    "observaciones": "Se solicitó la fuente de poder de repuesto al proveedor",
    "fecha_actualizacion": "2026-08-01T10:15:00.000Z"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes / `Estado inválido. Debe ser: Abierto, En proceso, Resuelto, Cerrado.` |
| `404` | `Ticket no encontrado` |
| `404` | `El usuario no existe o no tiene permisos para actualizar tickets.` (si `id_usuario` no es staff existente) |

## `GET /api/actualizacion`

- **Rol**: Administrador, Tecnico. Todas las entradas del sistema.

## `GET /api/actualizacion/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico. Historial completo de un ticket, incluidas entradas sin `observaciones`.
- **Error**: `404 "Ticket no encontrado"`.

## `GET /api/actualizacion/usuario/:id_usuario`

- **Rol**: Administrador, Tecnico. Entradas registradas por un miembro del staff puntual.
- **Error**: `404 "El usuario no existe o no tiene permisos para actualizar tickets."`

## `GET /api/actualizacion/notas/:id_ticket`

- **Rol**: Cliente.
- **Descripción**: la vista del cliente sobre el historial de su propio ticket. Filtra `WHERE observaciones IS NOT NULL` — el cliente **nunca** ve los cambios de estado "silenciosos" sin comentario, y la respuesta **excluye el campo `usuario`** (no revela qué persona del staff escribió la nota). Orden cronológico ascendente (a diferencia del resto de los listados de este módulo, que son descendentes).

### Respuesta exitosa (200)

```json
{
  "data": [
    { "id_actualizacion": 100, "estado": "En proceso", "observaciones": "Se solicitó la fuente de poder de repuesto al proveedor", "fecha_actualizacion": "2026-08-01T10:15:00.000Z" }
  ]
}
```

### Errores

| Status | Mensaje |
|---|---|
| `403` | `No tienes permisos para ver esta información.` (el ticket no es del cliente autenticado) |
| `404` | `Ticket no encontrado` |

## `GET /api/actualizacion/:id`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "Actualización no encontrada"`.

## `PUT /api/actualizacion/:id`

- **Rol**: Administrador, Tecnico.
- **Body**: `{ "estado": "...", "observaciones": "..." }` (`estado` obligatorio, mismo enum de arriba).
- **Error**: `404 "Actualización no encontrada"`.

## `DELETE /api/actualizacion/:id`

- **Rol**: Administrador. Hard delete.
