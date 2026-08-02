← [Volver al índice de la API](../06-api.md)

# Notas privadas — `/api/notas`

Notas internas de staff sobre un ticket, invisibles para el cliente — **no existe ninguna versión "pública" de una nota privada**, a diferencia de `actualizacion`. Solo 2 endpoints, ambos exclusivos de Administrador/Tecnico, con sesión requerida.

## `POST /api/notas`

- **Rol**: Administrador, Tecnico.
- **Descripción**: agrega una nota interna a un ticket. `id_usuario` (autor) se toma del **JWT**, nunca del body — si se envía igual, el controller lo sobrescribe (a diferencia de `actualizacion`, que sí confía en el body para ese campo).

### Body esperado

```json
{ "id_ticket": 45, "contenido": "El cliente ya autorizó verbalmente el gasto, pendiente de aprobar la cotización en el sistema" }
```

`contenido` no puede quedar vacío tras aplicar `.trim()`.

### Respuesta exitosa (200)

```json
{
  "message": "Nota registrada exitosamente",
  "data": {
    "id_nota": 33,
    "id_ticket": 45,
    "id_usuario": 4,
    "usuario": "Ana Pérez",
    "contenido": "El cliente ya autorizó verbalmente el gasto, pendiente de aprobar la cotización en el sistema",
    "fecha_creacion": "2026-08-01T10:45:00.000Z"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes / `El contenido de la nota es requerido.` (vacío tras trim) |
| `404` | `Ticket no encontrado` / `El usuario no existe o no tiene permisos para actualizar tickets.` |

## `GET /api/notas/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico.
- **Descripción**: notas de un ticket, orden cronológico ascendente.
- **Error**: `404 "Ticket no encontrado"`.
