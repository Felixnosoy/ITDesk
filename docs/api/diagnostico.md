← [Volver al índice de la API](../06-api.md)

# Diagnósticos — `/api/diagnostico`

Diagnóstico técnico de un ticket. **Ningún endpoint de este módulo es accesible por Cliente** — ni siquiera de solo lectura sobre su propio ticket (es la única asimetría de este tipo en todo el sistema junto con `nota_privada`, ver [14-problemas-conocidos.md](../14-problemas-conocidos.md), hallazgo J). Todas las rutas exigen sesión.

## `POST /api/diagnostico`

- **Rol**: Administrador, Tecnico.
- **Descripción**: crea (o **sobrescribe**, si ya existe) el diagnóstico de un ticket.

### Body esperado

```json
{
  "id_ticket": 45,
  "id_usuario": 4,
  "diagnostico": "Fuente de poder dañada, no llega corriente a la placa madre",
  "solucion": "Reemplazo de fuente de poder",
  "observaciones": "Cliente reporta caída de voltaje reciente en la zona"
}
```

`id_usuario` es el técnico que diagnostica. `solucion`/`observaciones` son opcionales.

**Comportamiento de upsert explícito**: como un ticket solo puede tener un diagnóstico (`UNIQUE` en la base), si ya existe uno para ese `id_ticket`, este mismo endpoint lo **actualiza** (incluyendo reasignar `id_usuario` al técnico que llamó) en vez de fallar. No es un error "crear" un segundo diagnóstico — simplemente reemplaza al anterior.

### Respuesta exitosa (200)

```json
{
  "message": "Diagnóstico registrado exitosamente",
  "data": {
    "id_diagnostico": 30,
    "id_ticket": 45,
    "id_usuario": 4,
    "tecnico": "Ana Pérez",
    "diagnostico": "Fuente de poder dañada, no llega corriente a la placa madre",
    "solucion": "Reemplazo de fuente de poder",
    "observaciones": "Cliente reporta caída de voltaje reciente en la zona",
    "fecha_diagnostico": "2026-08-01T10:10:00.000Z"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes |
| `404` | `Ticket no encontrado` |
| `404` | `El técnico no existe.` |

## `GET /api/diagnostico`

- **Rol**: Administrador, Tecnico. Todos los diagnósticos del sistema.

## `GET /api/diagnostico/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico. El/los diagnóstico(s) de un ticket (en la práctica, cero o uno).
- **Error**: `404 "Ticket no encontrado"`.

## `GET /api/diagnostico/tecnico/:id_tecnico`

- **Rol**: Administrador, Tecnico. Diagnósticos hechos por un técnico puntual.
- **Error**: `404 "El técnico no existe."`

## `GET /api/diagnostico/:id`

- **Rol**: Administrador, Tecnico.
- **Error**: `404 "Diagnóstico no encontrado"`.

## `PUT /api/diagnostico/:id`

- **Rol**: Administrador, Tecnico.
- **Body**: `{ "diagnostico": "...", "solucion": "...", "observaciones": "..." }` (`diagnostico` obligatorio; el resto opcional, se guarda `null` si no viene).
- **Error**: `404 "Diagnóstico no encontrado"`.

## `DELETE /api/diagnostico/:id`

- **Rol**: Administrador. Hard delete.
