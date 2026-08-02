← [Volver al índice de la API](../06-api.md)

# Encuestas de satisfacción — `/api/encuestas`

Calificación (1-5) que el cliente deja sobre un ticket ya cerrado, con comentario opcional. Una sola por ticket, sin endpoint de edición. Todas las rutas exigen sesión.

## `POST /api/encuestas`

- **Rol**: Cliente únicamente — nunca staff.
- **Descripción**: califica un ticket propio ya cerrado.

### Body esperado

```json
{ "id_ticket": 45, "calificacion": 5, "comentario": "Excelente atención, resolvieron rápido" }
```

`calificacion` debe ser un entero entre 1 y 5. `comentario` es opcional. `id_usuario` sale del JWT.

### Reglas

- El ticket debe pertenecer al cliente autenticado — si no, `403 "No tenés permisos para calificar este ticket."`
- El ticket debe estar `Cerrado` — si no, `409 "Solo se puede calificar un ticket ya cerrado."`
- No puede existir ya una encuesta para ese ticket — si existe, `409 "Este ticket ya fue calificado."` (una calificación por ticket, para siempre)

### Respuesta exitosa (200)

```json
{
  "message": "Encuesta registrada exitosamente",
  "data": {
    "id_encuesta": 18,
    "id_ticket": 45,
    "id_usuario": 12,
    "calificacion": 5,
    "comentario": "Excelente atención, resolvieron rápido",
    "fecha": "2026-08-01T11:05:00.000Z"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes / `La calificación debe ser un número entero entre 1 y 5.` |
| `403` | `No tenés permisos para calificar este ticket.` |
| `404` | `Ticket no encontrado` |
| `409` | No cerrado / ya calificado |

## `GET /api/encuestas/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico.
- **Descripción**: la encuesta de un ticket, o **`null`** si no existe (no lanza `404` — a diferencia de casi todos los demás "obtener por relación" del sistema).

## `GET /api/encuestas/mis/ticket/:id_ticket`

- **Rol**: Cliente.
- **Descripción**: igual que arriba pero con verificación de ownership; también devuelve `null` si no calificó.
- **Errores**: `403 "No tenés permisos para ver esta información."` / `404 "Ticket no encontrado"` (esto sí lanza 404, viene de la verificación del ticket).

## `GET /api/encuestas`

- **Rol**: **Administrador únicamente** — excluye a Tecnico (a diferencia del resto de módulos "de reportes", donde Tecnico suele tener lectura). Pensado para el resumen de reportes.
- **Descripción**: todas las encuestas del sistema.
