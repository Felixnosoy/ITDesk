← [Volver al índice de la API](../06-api.md)

# Visitas técnicas — `/api/visita-tecnica`

Sistema de agendamiento de visitas presenciales (Field Service Management). El cliente solicita, Recepción/Administrador coordina y confirma, el técnico ejecuta y actualiza el estado. Todas las rutas exigen sesión.

**Regla central**: el cliente **nunca crea un ticket directamente** al solicitar una visita — eso sigue siendo privilegio de staff. Al **confirmar**, si la visita no tiene un ticket vinculado, Recepción/Administrador crea uno nuevo (con un equipo del cliente) o vincula uno existente. A partir de ahí, diagnóstico/cotización/factura de esa visita se resuelven con los módulos de `ticket` ya existentes (ver [api/diagnostico.md](diagnostico.md), [api/cotizacion.md](cotizacion.md), [api/factura.md](factura.md)) — `visita_tecnica` no duplica esos campos, solo trackea la programación.

## Estados

`Pendiente` → `Confirmada` → `En camino` → `En progreso` → `Finalizada`, con `Cancelada` y `Reprogramada` como desvíos. `Finalizada` y `Cancelada` son terminales (409 ante cualquier transición posterior).

## `POST /api/visita-tecnica`

- **Rol**: Cliente.
- **Descripción**: solicita una visita. `id_usuario` sale del JWT.

### Body esperado

```json
{
  "id_especialidad": 1,
  "fecha_solicitada": "2026-08-10",
  "hora_solicitada": "14:00",
  "direccion": "Calle Principal 123",
  "motivo": "Instalación de red nueva en la oficina"
}
```

Fecha y hora deben ser futuras. Estado inicial `Pendiente`.

### Respuesta exitosa (200)

```json
{
  "message": "Visita técnica solicitada exitosamente",
  "data": {
    "id_visita": 10,
    "id_usuario": 12,
    "cliente": "Juan García",
    "id_especialidad": 1,
    "especialidad": "Redes",
    "id_tecnico": null,
    "tecnico": null,
    "id_ticket": null,
    "fecha_solicitada": "2026-08-10T00:00:00.000Z",
    "hora_solicitada": "14:00:00",
    "direccion": "Calle Principal 123",
    "motivo": "Instalación de red nueva en la oficina",
    "estado": "Pendiente",
    "fecha_creacion": "2026-08-04T10:00:00.000Z",
    "fecha_confirmacion": null,
    "observaciones": null
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | Campos faltantes / `La fecha y hora de la visita deben ser futuras.` |
| `404` | Especialidad no encontrada |

## `GET /api/visita-tecnica`

- **Rol**: Administrador, Recepcionista, Tecnico.
- **Descripción**: todas las visitas del sistema, orden ascendente por fecha/hora — alimenta el calendario de Recepción.

## `GET /api/visita-tecnica/mis`

- **Rol**: Cliente. Las visitas propias, orden descendente (más recientes primero).

## `GET /api/visita-tecnica/tecnico/mis`

- **Rol**: Tecnico. Las visitas asignadas al técnico autenticado, orden ascendente (cola de trabajo).

## `GET /api/visita-tecnica/disponibilidad`

- **Rol**: cualquiera autenticado.
- **Query params**: `id_especialidad`, `fecha` (`YYYY-MM-DD`).
- **Descripción**: técnicos activos con esa especialidad + los horarios que ya tienen ocupados ese día (cualquier visita no `Cancelada`). Chequeo de solapamiento simple, no un motor de turnos — informativo, no bloquea la creación.

### Respuesta exitosa (200)

```json
{
  "data": [
    { "id_usuario": 4, "nombre": "Ana Pérez", "horasOcupadas": ["10:00:00"] }
  ]
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | `id_especialidad y fecha son requeridos.` |
| `404` | Especialidad no encontrada |

## `GET /api/visita-tecnica/:id`

- **Rol**: Administrador, Recepcionista, Tecnico.
- **Error**: `404 "Visita no encontrada"`.

## `PATCH /api/visita-tecnica/:id/confirmar`

- **Rol**: Administrador, Recepcionista.
- **Descripción**: asigna técnico y, si la visita no tiene ticket vinculado, crea uno o vincula uno existente.

### Body esperado (crear ticket nuevo)

```json
{ "id_tecnico": 4, "id_equipo": 8 }
```

### Body esperado (vincular un ticket existente del mismo cliente)

```json
{ "id_tecnico": 4, "id_ticket": 45 }
```

`id_tecnico` es obligatorio salvo que la visita ya tuviera uno asignado de antes (`PATCH .../asignar`). Si no hay `id_ticket` previo ni en el body, hace falta `id_equipo` (el ticket se crea con categoría `Otro`, prioridad `Media`, título autogenerado de la especialidad, descripción = motivo de la visita). No se exige que el técnico tenga la especialidad pedida (verificación blanda, solo en el frontend) — para no trabar la operativa si Recepción necesita forzar una asignación.

### Errores

| Status | Mensaje |
|---|---|
| `400` | Sin técnico indicado / sin equipo ni ticket / ticket de otro cliente |
| `404` | Técnico o ticket no encontrado |
| `409` | Visita en estado terminal |

## `PATCH /api/visita-tecnica/:id/reprogramar`

- **Rol**: Administrador, Recepcionista.
- **Body**: `{ "fecha_solicitada": "2026-08-12", "hora_solicitada": "16:00" }` — ambas obligatorias, deben ser futuras.
- **Efecto**: `estado → Reprogramada`. Confirmar de nuevo (mismo endpoint de arriba) la vuelve a `Confirmada`.
- **Errores**: `400` / `404 "Visita no encontrada"` / `409` (estado terminal).

## `PATCH /api/visita-tecnica/:id/asignar`

- **Rol**: Administrador, Recepcionista.
- **Descripción**: cambia o reasigna el técnico responsable sin tocar el estado ni el ticket.
- **Body**: `{ "id_tecnico": 6 }`.
- **Errores**: `400` / `404` (técnico no existe) / `409` (estado terminal).

## `PATCH /api/visita-tecnica/:id/cancelar`

- **Rol**: Administrador, Recepcionista, o el Cliente dueño de la visita.
- **Descripción**: cancela la visita. Staff puede en cualquier estado no terminal; el Cliente solo mientras siga `Pendiente` o `Confirmada` (una vez que el técnico ya está en camino, tiene que coordinarse con el staff).
- **Body**: `{ "motivo": "..." }` — opcional, solo se usa para la descripción del evento de auditoría.
- **Errores**: `403` (cliente cancelando la visita de otro) / `404 "Visita no encontrada"` / `409` (estado terminal, o cliente intentando cancelar una visita ya en camino/en progreso).

## `PATCH /api/visita-tecnica/:id/estado`

- **Rol**: Tecnico (dueño de la visita), Administrador.
- **Descripción**: el técnico avanza su propia visita: `En camino` → `En progreso` → `Finalizada`. `Finalizada` exige que el ticket vinculado ya tenga diagnóstico registrado (mismo espíritu que el gate de "Resuelto" en `ticket`, ver [api/ticket.md](ticket.md)) — si no, `409` pidiendo registrarlo primero desde el ticket.

### Body esperado

```json
{ "estado": "En progreso", "observaciones": "Cliente confirmó horario, ya estoy en el sitio" }
```

`observaciones` es opcional — si no viene, se conserva la que ya hubiera (no se borra una nota anterior sin querer). Reenviar el mismo `estado` actual es una forma válida de solo actualizar `observaciones` sin avanzar de estado.

### Errores

| Status | Mensaje |
|---|---|
| `400` | Estado inválido (solo `En camino`/`En progreso`/`Finalizada`) |
| `403` | El técnico no es el dueño de esta visita |
| `404` | `Visita no encontrada` |
| `409` | Estado terminal / `Finalizada` sin ticket vinculado / `Finalizada` sin diagnóstico registrado |
