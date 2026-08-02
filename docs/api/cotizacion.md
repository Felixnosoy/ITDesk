← [Volver al índice de la API](../06-api.md)

# Cotizaciones — `/api/cotizacion`

Una cotización se crea vacía y se llena agregando líneas vía `/api/detalle-cotizacion` (ver [api/detalle-cotizacion.md](detalle-cotizacion.md)); `subtotal`/`itbis`/`total` se recalculan automáticamente cada vez que cambia una línea o el descuento global. Todas las rutas exigen sesión.

## `POST /api/cotizacion`

- **Rol**: Administrador, Tecnico.
- **Descripción**: crea una cotización vacía para un cliente.

### Body esperado

```json
{ "id_usuario": 12, "descuento_total": 0 }
```

`descuento_total` es opcional (default `0`); si viene, debe ser un número ≥ 0.

### Respuesta exitosa (200)

```json
{
  "message": "Cotización creada exitosamente",
  "data": {
    "id_cotizacion": 9,
    "id_usuario": 12,
    "cliente": "Juan García",
    "fecha_creacion": "2026-08-01T10:20:00.000Z",
    "subtotal": "0.00",
    "itbis": "0.00",
    "descuento_total": "0.00",
    "total": "0.00",
    "estado": "Pendiente"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | `Todos los campos obligatorios son requeridos.` / monto inválido |
| `404` | `El cliente no existe.` |

## `GET /api/cotizacion`

- **Rol**: Administrador, Tecnico. Todas las cotizaciones.

## `GET /api/cotizacion/mis`

- **Rol**: Cliente. Las cotizaciones del cliente autenticado.

## `GET /api/cotizacion/mis/:id`

- **Rol**: Cliente. La cotización propia + su `detalle` (líneas).
- **Errores**: `403 "No tienes permisos para ver esta información."` / `404 "Cotización no encontrada"`.

## `GET /api/cotizacion/usuario/:id_usuario`

- **Rol**: Administrador, Tecnico. Cotizaciones de un usuario puntual.
- **Error**: `404 "El cliente no existe."`

## `GET /api/cotizacion/:id`

- **Rol**: Administrador, Tecnico. Igual que `/mis/:id` pero sin chequeo de ownership.
- **Error**: `404 "Cotización no encontrada"`.

## `PATCH /api/cotizacion/:id/descuento`

- **Rol**: Administrador, Tecnico.
- **Descripción**: actualiza el descuento global y dispara el recálculo. **Solo si `estado === "Pendiente"`.**
- **Body**: `{ "descuento_total": 500 }`.
- **Errores**: `400` / `404 "Cotización no encontrada"` / `409 "No se puede modificar una cotización que no está pendiente."`.

## `PATCH /api/cotizacion/:id/estado`

- **Rol**: **Administrador únicamente** — excluye a Tecnico. Aprobar/rechazar es decisión del cliente (ver el endpoint `/mis/:id/estado` abajo); esta ruta de staff sirve para operaciones administrativas sobre el estado (por ejemplo, marcar `Vencida`).
- **Descripción**: cambia el estado a cualquiera de `Pendiente`/`Aprobada`/`Rechazada`/`Vencida`. **Solo permitido si la cotización está actualmente en `Pendiente`** — una vez que sale de ese estado, queda fija para siempre (no hay forma de "reabrir", hay que crear una cotización nueva).
- **Body**: `{ "estado": "Vencida" }`.
- **Errores**: `400` / `404 "Cotización no encontrada"` / `409 "Esta cotización ya no puede cambiar de estado."`.

## `PATCH /api/cotizacion/mis/:id/estado`

- **Rol**: Cliente.
- **Descripción**: el cliente aprueba o rechaza su propia cotización. Solo acepta `Aprobada` o `Rechazada` (nunca `Vencida`, esa es exclusiva de staff).
- **Body**: `{ "estado": "Aprobada" }`.
- **Errores**: `400 "Estado inválido. Debe ser: Aprobada o Rechazada."` / `403 "No tienes permisos para modificar esta cotización."` / `404 "Cotización no encontrada"` / `409` (ya no está pendiente).

## `DELETE /api/cotizacion/:id`

- **Rol**: Administrador. Borra primero las líneas de `detalle_cotizacion`, luego la cotización (cascada manual del lado de la aplicación).
