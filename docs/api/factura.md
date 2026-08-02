← [Volver al índice de la API](../06-api.md)

# Facturas — `/api/factura`

Una factura es un **snapshot** de una cotización `Aprobada` en el momento de facturar — copia montos y líneas tal cual estaban, no se recalcula en vivo después. Relación 1 a 1 con la cotización de origen. Todas las rutas exigen sesión.

## `POST /api/factura`

- **Rol**: Administrador, Tecnico.
- **Descripción**: genera una factura a partir de una cotización `Aprobada`.

### Body esperado

```json
{ "id_cotizacion": 9, "observaciones": "Pago contra entrega" }
```

`observaciones` es opcional.

### Reglas

1. La cotización debe estar `Aprobada` — si no, `409 "Solo se puede facturar una cotización aprobada."`
2. La cotización no puede tener ya una factura — relación 1:1 aplicada a nivel de aplicación (además de un `UNIQUE` en el schema) — si ya tiene, `409 "Esta cotización ya tiene una factura generada."`
3. La cotización debe tener al menos una línea de detalle — si no, `409 "La cotización no tiene líneas de detalle para facturar."`

Internamente, copia `subtotal`/`itbis`/`total` de la cotización sin recalcular, y copia cada línea de `detalle_cotizacion` a `detalle_factura` en un loop secuencial (sin transacción explícita — ver [14-problemas-conocidos.md](../14-problemas-conocidos.md), hallazgo O).

### Respuesta exitosa (200)

```json
{
  "message": "Factura generada exitosamente",
  "data": {
    "id_factura": 6,
    "id_cotizacion": 9,
    "id_usuario": 12,
    "cliente": "Juan García",
    "fecha_emision": "2026-08-01T10:30:00.000Z",
    "subtotal": "2300.00",
    "itbis": "414.00",
    "total": "2714.00",
    "estado": "Pendiente",
    "observaciones": "Pago contra entrega"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes |
| `404` | `Cotización no encontrada` |
| `409` | No aprobada / ya facturada / sin líneas |

## `GET /api/factura`

- **Rol**: Administrador, Tecnico. Todas las facturas.

## `GET /api/factura/mis`

- **Rol**: Cliente. Facturas del cliente autenticado.

## `GET /api/factura/mis/:id`

- **Rol**: Cliente. Factura propia + `detalle`.
- **Errores**: `403 "No tienes permisos para ver esta información."` / `404 "Factura no encontrada"`.

## `GET /api/factura/usuario/:id_usuario`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "El cliente no existe."`

## `GET /api/factura/:id`

- **Rol**: Administrador, Tecnico. Factura + `detalle`.
- **Error**: `404 "Factura no encontrada"`.

## `PATCH /api/factura/:id/estado`

- **Rol**: Administrador, Tecnico.
- **Descripción**: cambia el estado a `Pagada`, `Anulada` o `Vencida` (nunca de vuelta a `Pendiente`, ese solo es el estado inicial automático). `Pagada` y `Anulada` son estados finales (`409` si se intenta cambiar de nuevo); `Vencida` **no** es terminal, todavía puede pasar a `Pagada` o `Anulada`.
- **Body**: `{ "estado": "Pagada" }`.
- **Errores**: `400` / `404 "Factura no encontrada"` / `409 "Esta factura ya no puede cambiar de estado."`.

## `PATCH /api/factura/:id/observaciones`

- **Rol**: Administrador, Tecnico.
- **Descripción**: edita `observaciones`, sin restricción de estado (se puede editar incluso con la factura ya `Pagada`/`Anulada`).
- **Body**: `{ "observaciones": "..." }`.
- **Error**: `404 "Factura no encontrada"`.

## `DELETE /api/factura/:id`

- **Rol**: Administrador. Borra primero `detalle_factura`, luego `factura` (cascada manual).
