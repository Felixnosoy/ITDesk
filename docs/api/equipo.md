← [Volver al índice de la API](../06-api.md)

# Equipos — `/api/equipo`

Todas las rutas exigen sesión (`autenticarToken`). Un equipo siempre pertenece a un usuario con `rol = "Cliente"`.

## `POST /api/equipo`

- **Rol**: Administrador, Tecnico, Recepcionista.
- **Descripción**: registra un equipo a nombre de un cliente existente.

### Body esperado

```json
{
  "id_usuario": 12,
  "tipo": "Laptop",
  "marca": "Dell",
  "modelo": "Inspiron 15",
  "numero_serie": "ABC123XYZ",
  "estado": "Activo",
  "observaciones": "Pantalla con una línea vertical"
}
```

`numero_serie` se normaliza a mayúsculas y sin espacios al guardar. `observaciones` es opcional; el resto es obligatorio.

### Respuesta exitosa (200)

```json
{
  "message": "Equipo creado exitosamente",
  "data": {
    "id_equipo": 8,
    "id_usuario": 12,
    "tipo": "Laptop",
    "marca": "Dell",
    "modelo": "Inspiron 15",
    "numero_serie": "ABC123XYZ",
    "estado": "Activo",
    "fecha_registro": "2026-08-01T10:00:00.000Z",
    "observaciones": "Pantalla con una línea vertical"
  }
}
```

> ⚠️ Nótese que esta respuesta **no incluye el campo `cliente`** (nombre del dueño) que sí traen todas las demás lecturas de este recurso — ver [14-problemas-conocidos.md](../14-problemas-conocidos.md), hallazgo N.

### Errores

| Status | Mensaje |
|---|---|
| `400` | `Todos los campos obligatorios son requeridos.` |
| `404` | `El cliente no existe.` (si `id_usuario` no es un Cliente existente) |
| `409` | `Ya existe un equipo con ese número de serie.` |

## `GET /api/equipo`

- **Rol**: Administrador, Tecnico, Recepcionista.
- **Respuesta**: array de equipos, cada uno con `cliente` (nombre completo, vía JOIN). Vacío `[]` si no hay equipos (no lanza error, a diferencia de `GET /usuarios`).

## `GET /api/equipo/usuario/:id_usuario`

- **Rol**: Administrador, Tecnico, Recepcionista.
- **Descripción**: equipos de un usuario puntual (cualquier rol de usuario, no exige que sea Cliente).
- **Error**: `404 "El cliente no existe."`

## `GET /api/equipo/:id`

- **Rol**: Administrador, Tecnico — **excluye a Recepcionista**, a diferencia de los tres endpoints anteriores.
- **Error**: `404 "Equipo no encontrado"`.

## `PUT /api/equipo/:id`

- **Rol**: Administrador, Tecnico.
- **Descripción**: actualiza los datos del equipo. `id_usuario` (dueño) **no se puede reasignar** por este endpoint.

### Body esperado

```json
{
  "tipo": "Laptop",
  "marca": "Dell",
  "modelo": "Inspiron 15",
  "numero_serie": "ABC123XYZ",
  "estado": "En reparación",
  "observaciones": "Se reemplazó la pantalla"
}
```

- **Errores**: `400` / `404 "Equipo no encontrado"` / `409 "Ya existe un equipo con ese número de serie."`.

## `DELETE /api/equipo/:id`

- **Rol**: Administrador.
- **Descripción**: hard delete, sin manejo explícito de FK (un equipo con tickets asociados probablemente falla por constraint).
