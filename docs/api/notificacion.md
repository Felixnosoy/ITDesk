← [Volver al índice de la API](../06-api.md)

# Notificaciones — `/api/notificacion`

Notificación dirigida a un usuario sobre eventos de un ticket. **Nunca se dispara automáticamente** como efecto secundario de otro flujo del sistema (a diferencia de `auditoria`) — todas nacen de un `POST` explícito hecho por el staff (o el frontend en su nombre). Todas las rutas exigen sesión.

## `POST /api/notificacion`

- **Rol**: Administrador, Tecnico.
- **Descripción**: crea una notificación para un usuario.

### Body esperado

```json
{
  "id_ticket": 45,
  "id_usuario": 12,
  "tipo": "cambio_estado",
  "mensaje": "Tu ticket #45 cambió a estado En proceso"
}
```

`tipo` no está limitado a un enum fijo, pero sí a máximo 50 caracteres. `id_usuario` (destinatario) puede ser cualquier rol.

### Respuesta exitosa (200)

```json
{
  "message": "Notificación creada exitosamente",
  "data": {
    "id_notificacion": 80,
    "id_ticket": 45,
    "ticket_titulo": "No enciende",
    "id_usuario": 12,
    "usuario": "Juan García",
    "tipo": "cambio_estado",
    "mensaje": "Tu ticket #45 cambió a estado En proceso",
    "leida": 0,
    "fecha_envio": "2026-08-01T10:35:00.000Z"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes / `El campo tipo no puede superar los 50 caracteres.` |
| `404` | `Ticket no encontrado` / `El usuario no existe.` |

## `GET /api/notificacion`

- **Rol**: Administrador, Tecnico. Todas las notificaciones del sistema.

## `GET /api/notificacion/mis`

- **Rol**: cualquiera autenticado. Las notificaciones del usuario en sesión.

## `PATCH /api/notificacion/mis/:id/leida`

- **Rol**: cualquiera autenticado, solo sobre sus propias notificaciones.
- **Errores**: `404 "Notificación no encontrada"` / `403 "No tienes permisos para modificar esta notificación."`.

## `PATCH /api/notificacion/mis/leidas`

- **Rol**: cualquiera autenticado.
- **Descripción**: marca todas las notificaciones no leídas del usuario en sesión como leídas de una vez.
- **Respuesta**: array de notificaciones del usuario (ya todas leídas).

## `GET /api/notificacion/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "Ticket no encontrado"`.

## `GET /api/notificacion/usuario/:id_usuario`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "El usuario no existe."`

## `GET /api/notificacion/:id`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "Notificación no encontrada"`.

## `DELETE /api/notificacion/:id`

- **Rol**: Administrador. Hard delete.
