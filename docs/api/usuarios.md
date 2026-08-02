← [Volver al índice de la API](../06-api.md)

# Usuarios — `/api/usuarios`

Todas las rutas de este recurso exigen sesión válida (`autenticarToken`). El control de rol varía por endpoint — algunos usan `verificarRol`, otros validan ownership dentro del controller.

## `POST /api/usuarios`

- **Rol**: Administrador, Recepcionista.
- **Descripción**: crea un usuario nuevo (cliente o staff). **Si quien llama es Recepcionista, el rol se fuerza a `Cliente` sin importar qué venga en el body** — un recepcionista solo puede dar de alta clientes.

### Body esperado

```json
{
  "nombre": "Juan",
  "apellido": "García",
  "correo": "juan.garcia@correo.test",
  "contraseña": "ClaveSegura123!",
  "rol": "Cliente",
  "tipo_documento": "Cedula",
  "num_documento": "40212345678",
  "telefono": "8095551234",
  "direccion": "Calle Principal 123",
  "especialidad": null,
  "estado": "Activo"
}
```

Ningún campo se valida explícitamente como obligatorio en el service (a diferencia del resto de los `crear*` del sistema) — si falta `contraseña`, el hash de bcrypt falla con un error de bajo nivel, no un `400` limpio. Ver [14-problemas-conocidos.md](../14-problemas-conocidos.md), hallazgo D.

### Respuesta exitosa (200)

```json
{
  "message": "Usuario creado exitosamente",
  "data": {
    "id_usuario": 17,
    "nombre": "Juan",
    "apellido": "García",
    "correo": "juan.garcia@correo.test",
    "rol": "Cliente",
    "tipo_documento": "Cedula",
    "num_documento": "40212345678",
    "telefono": "8095551234",
    "direccion": "Calle Principal 123",
    "especialidad": null,
    "estado": "Activo",
    "fecha_registro": "2026-08-01T10:00:00.000Z"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `409` | `El correo ya esta registrado.` |
| `409` | `El numero de documento ya esta registrado. ` (espacio final literal en el código) |

## `GET /api/usuarios`

- **Rol**: Administrador, Recepcionista.
- **Descripción**: lista todos los usuarios.
- **Respuesta**: array de usuarios (mismas columnas que la creación, sin `contraseña`).
- **Error**: `404 "No existen usuarios registrados."` si la tabla está vacía — a diferencia de otros listados del sistema, que devuelven `[]` en ese caso.

## `GET /api/usuarios/:id`

- **Rol**: cualquiera autenticado, pero solo **staff** (Administrador/Tecnico/Recepcionista) o el **dueño de la cuenta** (`id` = su propio `id_usuario`). El control vive en el controller, no en la ruta.
- **Respuesta**: objeto usuario.
- **Errores**: `403 "No tenés permisos para ver este usuario."` / `409 "usuario no encontrado"` (⚠️ status 409, no 404 — inconsistencia real, ver [14-problemas-conocidos.md](../14-problemas-conocidos.md), hallazgo C).

## `PUT /api/usuarios/:id`

- **Rol**: Administrador, Tecnico.
- **Descripción**: actualiza los datos de un usuario (nunca la contraseña — ese es un endpoint aparte).

### Body esperado

```json
{
  "nombre": "Juan",
  "apellido": "García",
  "correo": "juan.garcia@correo.test",
  "rol": "Cliente",
  "tipo_documento": "Cedula",
  "num_documento": "40212345678",
  "telefono": "8095551234",
  "direccion": "Calle Principal 123",
  "especialidad": null
}
```

- **Errores**: `404 "usuario no encontrado"` (acá sí es 404) / `409 "El correo ya esta registrado."` / `409 "El numero de documento ya esta registrado. "`.

## `PATCH /api/usuarios/:id/estado`

- **Rol**: Administrador.
- **Descripción**: activa o desactiva un usuario (soft-delete).
- **Body**: `{ "estado": "Activo" }` o `{ "estado": "Inactivo" }` (acepta variantes de mayúsculas/minúsculas).
- **Errores**: `404 "usuario no encontrado"` / `400 "Estado inválido"`.

## `PATCH /api/usuarios/:id/clave`

- **Rol**: cualquiera autenticado, solo sobre su propia cuenta.
- **Descripción**: el propio usuario cambia su contraseña (exige la actual).
- **Body**: `{ "contraseñaActual": "...", "contraseñaNueva": "..." }` (mínimo 8 caracteres).
- **Respuesta**: `{ "message": "Contraseña actualizada exitosamente" }` (sin `data`).
- **Errores**: `403 "Solo podés cambiar tu propia contraseña."` / `400` (campos faltantes / clave corta / clave actual incorrecta) / `404 "usuario no encontrado"`.

## `PATCH /api/usuarios/:id/clave/reset`

- **Rol**: Administrador.
- **Descripción**: resetea la contraseña de cualquier usuario, **sin pedir la clave actual** (operación privilegiada).
- **Body**: `{ "contraseñaNueva": "..." }` (mínimo 8 caracteres).
- **Respuesta**: `{ "message": "Contraseña reseteada exitosamente" }`.
- **Errores**: `404 "usuario no encontrado"` / `400 "La nueva contraseña debe tener al menos 8 caracteres."`.

## `PATCH /api/usuarios/:id/perfil`

- **Rol**: cualquiera autenticado, solo sobre su propia cuenta.
- **Descripción**: autoedición de perfil. **Solo `telefono` y `direccion` se procesan** — cualquier otro campo del body (incluido `rol` o `correo`) se descarta silenciosamente. Es el mecanismo por el que un usuario nunca puede escalar su propio rol.
- **Body**: `{ "telefono": "...", "direccion": "..." }`.
- **Errores**: `403 "Solo podés editar tu propio perfil."` / `404 "usuario no encontrado"`.

## `DELETE /api/usuarios/:id`

- **Rol**: Administrador.
- **⚠️ Marcado en el propio código como "solo para datos de pruebas (no se debe usar)".** Es un hard delete sin manejo de las probables FK desde `ticket`, `equipo`, `asignacion`, `diagnostico`, `actualizacion`, `cotizacion`, `factura`, `notificacion`, `archivo_adjunto`, `nota_privada` y `auditoria` — borrar un usuario con historial relacionado muy probablemente falla con un error de constraint no capturado (cae como `500` genérico). Para dar de baja un usuario en la práctica, usar `PATCH /api/usuarios/:id/estado` con `"Inactivo"`.
- **Errores**: `409 "usuario no encontrado"` (mismo bug de status que en `GET /:id`) / `500` probable si hay filas relacionadas.
