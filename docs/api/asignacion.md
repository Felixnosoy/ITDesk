← [Volver al índice de la API](../06-api.md)

# Asignaciones — `/api/asignacion`

Vincula un ticket con un técnico "sugerido". No restringe qué técnico puede trabajar el ticket — cualquier técnico ve y puede operar cualquier ticket (`GET /api/ticket` no filtra por asignación); este módulo es un registro de responsable sugerido, no un control de acceso. Todas las rutas exigen sesión.

## `POST /api/asignacion`

- **Rol**: Administrador, Tecnico.
- **Descripción**: asigna un técnico a un ticket.

### Body esperado

```json
{ "id_ticket": 45, "id_usuario": 4 }
```

`id_usuario` es el id del técnico a asignar (debe tener `rol = "Tecnico"`).

**Solo puede haber una asignación activa por ticket a la vez** — si ya existe una, este endpoint responde `409`; para cambiar de técnico hay que usar `PUT /api/asignacion/:id` sobre la asignación existente, no crear una segunda.

### Respuesta exitosa (200)

```json
{
  "message": "Asignación creada exitosamente",
  "data": {
    "id_asignacion": 20,
    "id_ticket": 45,
    "id_usuario": 4,
    "tecnico": "Ana Pérez",
    "fecha_asignacion": "2026-08-01T10:05:00.000Z",
    "activa": 1
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes |
| `404` | `Ticket no encontrado` |
| `404` | `El técnico no existe.` |
| `409` | `Este ticket ya tiene un técnico asignado.` |

## `GET /api/asignacion`

- **Rol**: Administrador, Tecnico. Todas las asignaciones del sistema.

## `GET /api/asignacion/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico. Historial completo (activas e inactivas) de un ticket.
- **Error**: `404 "Ticket no encontrado"`.

## `GET /api/asignacion/tecnico/:id_tecnico`

- **Rol**: Administrador, Tecnico. Asignaciones de un técnico puntual.
- **Error**: `404 "El técnico no existe."`

## `GET /api/asignacion/:id`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "Asignación no encontrada"`.

## `PUT /api/asignacion/:id`

- **Rol**: Administrador, Tecnico.
- **Descripción**: mecanismo real de "reasignar" — edita la fila existente (no crea una nueva).

### Body esperado

```json
{ "id_usuario": 6, "activa": true }
```

`activa` debe ser un **booleano real** (`true`/`false`), no `"true"`/`1`.

### Errores

| Status | Mensaje |
|---|---|
| `400` | `Todos los campos obligatorios son requeridos.` |
| `404` | `Asignación no encontrada` |
| `404` | `El técnico no existe.` |

## `DELETE /api/asignacion/:id`

- **Rol**: Administrador. Hard delete.
