← [Volver al índice de la API](../06-api.md)

# Estadísticas públicas — `/api/estadisticas`

## `GET /api/estadisticas/publicas`

- **Autenticación**: ninguna. Es, junto con `GET /api/health`, una de las **únicas 2 rutas de todo el backend sin `autenticarToken`** — comentario explícito en el código: *"es la unica pantalla del sistema sin sesion (index.html) y solo expone 4 conteos agregados, nunca una fila individual."*
- **Descripción**: alimenta la sección de estadísticas de la landing pública (`index.html`). Una sola consulta con 4 subconsultas `COUNT(*)`:
  - `tickets_registrados` — total de tickets del sistema.
  - `clientes_activos` — usuarios con `rol = 'Cliente'` **y** `estado = 'Activo'`.
  - `tecnicos_especializados` — usuarios con `rol = 'Tecnico'` (sin filtrar por `estado`, cuenta también técnicos inactivos).
  - `porcentaje_resueltos` — `(tickets en Resuelto o Cerrado / total) × 100`, redondeado a 1 decimal, `0` explícito si no hay tickets (evita división por cero).
- **Body/params**: ninguno.

### Respuesta exitosa (200)

```json
{
  "data": {
    "tickets_registrados": 128,
    "clientes_activos": 47,
    "tecnicos_especializados": 6,
    "porcentaje_resueltos": 66.7
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `500` | Genérico, si falla la consulta (no hay validación de negocio posible, no recibe parámetros) |

> Este endpoint **no** alimenta `reportes.html` (el módulo de reportes internos del Administrador) — ese se arma en el frontend combinando otros endpoints ya existentes (tickets, facturas, encuestas, auditoría). Es exclusivamente para la landing pública sin sesión.
