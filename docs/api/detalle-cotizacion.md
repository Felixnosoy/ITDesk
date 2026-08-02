← [Volver al índice de la API](../06-api.md)

# Detalle de cotización — `/api/detalle-cotizacion`

Líneas de una cotización (mano de obra / repuestos / descuento por línea). Cada línea dispara un recálculo de `subtotal`/`itbis`/`total` en la cotización padre. Todas las rutas exigen sesión.

## `POST /api/detalle-cotizacion`

- **Rol**: Administrador, Tecnico.
- **Descripción**: agrega una línea a una cotización `Pendiente`.

### Body esperado

```json
{
  "id_cotizacion": 9,
  "id_ticket": 45,
  "descripcion_servicio": "Reemplazo de fuente de poder",
  "mano_obra": 800,
  "repuestos": 1500,
  "descuento": 0
}
```

`mano_obra`, `repuestos`, `descuento` son opcionales (default `0`, deben ser ≥ 0 si vienen).

### Gates de negocio

1. La cotización debe existir y estar `Pendiente` — si no, `409 "No se pueden modificar los detalles de una cotización que no está pendiente."`
2. El ticket debe existir y pertenecer al mismo cliente que la cotización — si no, `400 "El ticket no pertenece al mismo cliente de la cotización."`
3. **El ticket debe tener al menos un diagnóstico registrado** — si no, `409 "Debe existir un diagnóstico del ticket antes de crear una cotización."` (ver [api/diagnostico.md](diagnostico.md))
4. El ticket no puede tener ya otra línea perteneciente a una cotización `Pendiente` o `Aprobada` (una cotización activa a la vez) — si la hay, `409 "Este ticket ya tiene una cotización activa (Pendiente o Aprobada)."` Una cotización `Rechazada` o `Vencida` no bloquea — se puede volver a cotizar el mismo ticket.

### Respuesta exitosa (200)

```json
{
  "message": "Detalle de cotización agregado exitosamente",
  "data": {
    "id_detalle_cotizacion": 15,
    "id_cotizacion": 9,
    "id_ticket": 45,
    "ticket_titulo": "No enciende",
    "descripcion_servicio": "Reemplazo de fuente de poder",
    "mano_obra": "800.00",
    "repuestos": "1500.00",
    "descuento": "0.00"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes / monto inválido / ticket de otro cliente |
| `404` | `Cotización no encontrada` / `Ticket no encontrado` |
| `409` | No pendiente / sin diagnóstico / ya tiene línea activa |

## `GET /api/detalle-cotizacion`

- **Rol**: Administrador, Tecnico. Todas las líneas de todas las cotizaciones.

## `GET /api/detalle-cotizacion/cotizacion/:id_cotizacion`

- **Rol**: Administrador, Tecnico. Líneas de una cotización, orden ascendente.
- **Error**: `404 "Cotización no encontrada"`.

## `GET /api/detalle-cotizacion/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico. Líneas asociadas a un ticket.
- **Error**: `404 "Ticket no encontrado"`.

## `GET /api/detalle-cotizacion/mis/ticket/:id_ticket`

- **Rol**: Cliente. Variante con verificación de ownership del ticket.
- **Errores**: `403 "No tienes permisos para ver esta información."` / `404 "Ticket no encontrado"`.

## `GET /api/detalle-cotizacion/:id`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "Detalle de cotización no encontrado"`.

## `PUT /api/detalle-cotizacion/:id`

- **Rol**: Administrador, Tecnico.
- **Descripción**: edita una línea existente. Solo si la cotización sigue `Pendiente`. Dispara recálculo.
- **Body**: `{ "descripcion_servicio": "...", "mano_obra": 800, "repuestos": 1500, "descuento": 100 }` (`descripcion_servicio` obligatorio).
- **Errores**: `404 "Detalle de cotización no encontrado"` / `409` (no pendiente).

## `DELETE /api/detalle-cotizacion/:id`

- **Rol**: Administrador, **Tecnico** — a diferencia de casi todos los demás `DELETE` del sistema, acá Tecnico sí puede borrar. Solo si la cotización sigue `Pendiente`. Dispara recálculo.
- **Errores**: `404 "Detalle de cotización no encontrado"` / `409` (no pendiente).
