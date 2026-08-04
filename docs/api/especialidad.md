← [Volver al índice de la API](../06-api.md)

# Especialidades técnicas — `/api/especialidad`

Catálogo estructurado de especialidades (Redes, Hardware, Software, Servidores, CCTV, Impresoras, Seguridad, Microsoft 365, Virtualización — las 9 sembradas inicialmente), usado para relacionar técnicos con el tipo de servicio que pueden atender. Distinto del campo `usuario.especialidad` (texto libre de perfil, sin cambios). Todas las rutas exigen sesión.

Ver también [api/visita-tecnica.md](visita-tecnica.md) (usa este catálogo para el tipo de servicio pedido) y [api/usuarios.md](usuarios.md) (endpoints para asignar especialidades a un técnico puntual).

## `GET /api/especialidad`

- **Rol**: cualquiera autenticado (se usa tanto en la gestión de Administrador como en el formulario de agendar visita del Cliente).
- **Descripción**: catálogo completo, orden alfabético.

### Respuesta exitosa (200)

```json
{
  "data": [
    { "id_especialidad": 2, "nombre": "Hardware", "fecha_creacion": "2026-08-01T00:00:00.000Z" },
    { "id_especialidad": 1, "nombre": "Redes", "fecha_creacion": "2026-08-01T00:00:00.000Z" }
  ]
}
```

## `POST /api/especialidad`

- **Rol**: Administrador.
- **Body**: `{ "nombre": "Cloud" }`.
- **Errores**: `400` (falta el nombre) / `409 "Ya existe una especialidad con ese nombre."`

## `PUT /api/especialidad/:id`

- **Rol**: Administrador.
- **Descripción**: renombra una especialidad existente.
- **Body**: `{ "nombre": "Nuevo nombre" }`.
- **Errores**: `400` / `404 "Especialidad no encontrada"` / `409` (nombre en uso por otra).

## `DELETE /api/especialidad/:id`

- **Rol**: Administrador.
- **Descripción**: elimina del catálogo. Rechaza si algún técnico la tiene asignada — hay que quitársela primero (`PUT /api/usuarios/:id/especialidades`).
- **Errores**: `404 "Especialidad no encontrada"` / `409 "No se puede eliminar: hay técnicos con esta especialidad asignada."`

## Especialidades de un técnico puntual

Estos dos endpoints viven bajo el prefijo `/api/usuarios` (no `/api/especialidad`), documentados en detalle en [api/usuarios.md](usuarios.md):

- `GET /api/usuarios/:id/especialidades` — especialidades actuales de ese técnico.
- `PUT /api/usuarios/:id/especialidades` (Administrador) — reemplaza el set completo (`{ "especialidades": [1, 2] }`), no agrega/quita de a una.
