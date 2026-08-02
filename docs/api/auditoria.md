← [Volver al índice de la API](../06-api.md)

# Auditoría — `/api/auditoria`

Log de eventos del sistema. **Sin `POST` propio**: los eventos se registran internamente desde otros servicios (usuario, ticket, asignación, cotización, factura, archivo, encuesta), nunca vía un endpoint público — así nadie puede fabricar una entrada de auditoría falsa.

## `GET /api/auditoria`

- **Rol**: Administrador, Tecnico.
- **Descripción**: los últimos 500 eventos (`LIMIT 500`, sin paginación real de backend — mismo criterio client-side que el resto del sistema), con `LEFT JOIN` a `ticket` (no `INNER`, porque hay eventos sin ticket asociado, como `USUARIO_CREADO` o `CLAVE_RESETEADA`).

### Ejemplo de respuesta

```json
{
  "data": [
    {
      "id_auditoria": 501,
      "id_usuario": 4,
      "usuario": "Ana Pérez",
      "rol": "Tecnico",
      "accion": "TICKET_RESUELTO_SIN_COSTO",
      "descripcion": "Resolvió el ticket #45 sin costo: se resolvió con un reinicio",
      "id_ticket": 45,
      "ticket_titulo": "No enciende",
      "fecha": "2026-08-01T11:00:00.000Z"
    }
  ]
}
```

## Cómo se generan los eventos (no expuesto por HTTP)

Internamente existe una función `registrarEvento({ id_usuario, accion, descripcion, id_ticket })`, invocada en fire-and-forget (sin `await`) desde los controllers de: `usuario` (`USUARIO_CREADO`, `USUARIO_ACTIVADO`/`USUARIO_DESACTIVADO`, `CLAVE_RESETEADA`), `ticket` (`TICKET_CREADO`, `TICKET_CERRADO`, `TICKET_RESUELTO_SIN_COSTO`), `asignacion` (`TICKET_ASIGNADO`, `TICKET_REASIGNADO`), `cotizacion` (`COTIZACION_APROBADA`/`COTIZACION_RECHAZADA`/etc.), `factura` (`FACTURA_{ESTADO}`), `archivo` (`ARCHIVO_ELIMINADO`), `encuesta` (`TICKET_CALIFICADO`).

**Si el `INSERT` de auditoría falla, el error se traga (`try/catch` con solo `console.error`)** — la acción de negocio que lo disparó igual se considera exitosa. Esto es deliberado: un fallo al auditar nunca debe bloquear la operación real.
