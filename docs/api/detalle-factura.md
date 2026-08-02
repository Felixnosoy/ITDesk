← [Volver al índice de la API](../06-api.md)

# Detalle de factura — `/api/detalle-factura`

Módulo **de solo lectura**: las líneas nacen automáticamente al crear una factura (copiadas de `detalle_cotizacion`, ver [api/factura.md](factura.md)) y no se editan manualmente — no hay `POST`, `PUT` ni `DELETE` propios. Todas las rutas exigen sesión y rol Administrador o Tecnico.

## `GET /api/detalle-factura`

- **Descripción**: todas las líneas de todas las facturas, sin filtro.
- **Nota**: no se encontró ningún consumidor de esta variante bulk en el frontend actual — posible endpoint sin uso real, ver [14-problemas-conocidos.md](../14-problemas-conocidos.md), hallazgo H.

## `GET /api/detalle-factura/factura/:id_factura`

- **Descripción**: líneas de una factura puntual, orden ascendente.
- **Error**: `404 "Factura no encontrada"`.

## `GET /api/detalle-factura/ticket/:id_ticket`

- **Descripción**: líneas asociadas a un ticket.
- **Error**: `404 "Ticket no encontrado"`.

## `GET /api/detalle-factura/:id`

- **Error**: `404 "Detalle de factura no encontrado"`.

### Ejemplo de respuesta (cualquiera de los endpoints anteriores)

```json
{
  "data": [
    {
      "id_detalle_factura": 12,
      "id_factura": 6,
      "id_ticket": 45,
      "descripcion_servicio": "Reemplazo de fuente de poder",
      "mano_obra": "800.00",
      "repuestos": "1500.00",
      "descuento": "0.00"
    }
  ]
}
```
