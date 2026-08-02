# 9. Flujo del sistema

## Recorrido típico de un ticket

Un caso completo, desde que el cliente llega al mostrador hasta que califica el servicio, involucra a los 4 roles en distintos momentos:

```mermaid
flowchart TD
    A["Cliente llega en persona<br/>(o llama) a reportar una falla"] --> B["Recepcionista busca o crea<br/>al cliente y su equipo"]
    B --> C["Recepcionista crea el ticket<br/>POST /api/ticket — estado inicial: Abierto"]
    C --> D["Un Técnico (cualquiera, no hay<br/>asignación exclusiva) revisa la cola"]
    D --> E["Técnico opcionalmente asigna<br/>un especialista sugerido<br/>POST /api/asignacion"]
    E --> F["Técnico registra el diagnóstico<br/>POST /api/diagnostico"]
    F --> G["Técnico crea una cotización<br/>y agrega líneas de detalle<br/>(exige diagnóstico previo)"]
    G --> H{"Cliente revisa la<br/>cotización"}
    H -->|Rechaza| I["Cotización queda Rechazada<br/>— se puede recotizar el mismo ticket"]
    I --> G
    H -->|Aprueba| J["Cotización queda Aprobada<br/>PATCH /cotizacion/mis/:id/estado"]
    J --> K["Técnico genera la factura<br/>POST /api/factura (snapshot de la cotización)"]
    K --> L{"¿Requiere marcar<br/>Resuelto?"}
    L -->|Sí, con factura vigente| M["PATCH /ticket/:id/estado<br/>estado: Resuelto"]
    L -->|Sin costo, con motivo| M
    M --> N["Técnico o Administrador<br/>cierra el ticket<br/>PATCH /ticket/:id/cerrar"]
    N --> O["Cliente califica el servicio<br/>POST /api/encuestas (1-5 estrellas)"]

    C -.-> P["Cada cambio relevante genera<br/>una entrada de auditoría (automática)"]
    F -.-> Q["Actualizaciones de estado se registran<br/>en el log público del ticket<br/>(actualizacion, visible al cliente si tiene observaciones)"]
```

### Notas sobre el diagrama

- El camino "feliz" (diagnóstico → cotización → aprobación → factura → resuelto → cerrado → calificación) es el más común, pero **no es obligatorio en ese orden estricto en todos los puntos**: un ticket puede cerrarse directamente desde "Abierto" (`PATCH /ticket/:id/cerrar` no exige un estado previo), y puede marcarse "Resuelto sin costo" saltándose por completo el circuito de cotización/factura, siempre que se declare un motivo explícito.
- **El único gate de negocio duro en todo este flujo** es que un ticket no puede pasar a `Resuelto` sin una cotización `Aprobada` con factura vigente — o la excepción explícita "sin costo". Ver [api/ticket.md](api/ticket.md).
- La aprobación/rechazo de la cotización es **siempre decisión del cliente** (o de un Administrador actuando en su nombre) — nunca del técnico que hizo el diagnóstico. Ver [api/cotizacion.md](api/cotizacion.md).
- Una cotización rechazada no bloquea el ticket: se puede volver a cotizar (regla "una sola línea de cotización activa por ticket", pero `Rechazada`/`Vencida` no cuentan como activas).

## Ciclo de vida del ticket (estados)

```mermaid
stateDiagram-v2
    [*] --> Abierto: POST /ticket
    Abierto --> EnProceso: PATCH /ticket/:id/estado
    EnProceso --> Resuelto: requiere cotización Aprobada + factura vigente, o sin_costo + motivo
    Resuelto --> EnProceso: PATCH /ticket/:id/estado (retrocede, limpia fecha_resolucion)
    Abierto --> Cerrado: PATCH /ticket/:id/cerrar
    EnProceso --> Cerrado: PATCH /ticket/:id/cerrar
    Resuelto --> Cerrado: PATCH /ticket/:id/cerrar
    Cerrado --> [*]: estado final, inmutable
```

`Cerrado` es un estado terminal real: ni `cambiarEstadoTicket` ni `cerrarTicket` permiten ninguna transición posterior (ambos responden `409`).

## Ciclo de vida de una cotización

```mermaid
stateDiagram-v2
    [*] --> Pendiente: POST /cotizacion (vacía, se llena con líneas)
    Pendiente --> Aprobada: cliente aprueba, PATCH /cotizacion/mis/:id/estado
    Pendiente --> Rechazada: cliente rechaza
    Pendiente --> Vencida: staff, PATCH /cotizacion/:id/estado (solo Administrador)
    Aprobada --> [*]: estado final — habilita facturar
    Rechazada --> [*]: estado final — se puede crear una cotización nueva para el mismo ticket
    Vencida --> [*]: estado final
```

Una vez que una cotización sale de `Pendiente`, **queda fija para siempre** — no existe forma de "reabrirla"; la única salida es crear una cotización nueva.

## Ciclo de vida de una factura

```mermaid
stateDiagram-v2
    [*] --> Pendiente: POST /factura (snapshot de una cotización Aprobada)
    Pendiente --> Pagada: PATCH /factura/:id/estado
    Pendiente --> Anulada: PATCH /factura/:id/estado
    Pendiente --> Vencida: PATCH /factura/:id/estado
    Vencida --> Pagada: aún puede cambiar
    Vencida --> Anulada: aún puede cambiar
    Pagada --> [*]: estado final
    Anulada --> [*]: estado final
```

`Vencida`, a diferencia de en `cotizacion`, **no es un estado terminal** en `factura` — puede seguir cambiando a `Pagada` o `Anulada`.

## Trazabilidad: qué queda registrado en cada paso

| Evento del flujo | Dónde queda |
|---|---|
| Casi cualquier acción relevante (crear ticket, cerrar, asignar, aprobar cotización, cambiar factura, eliminar archivo, calificar) | `auditoria` — automático, fire-and-forget, nunca bloquea la acción principal |
| Cambios de estado del ticket con comentario | `actualizacion` — log público, visible al cliente si tiene `observaciones` |
| Comentarios internos del staff | `nota_privada` — nunca visible al cliente |
| Avisos puntuales a un usuario | `notificacion` — nunca automático, siempre creado explícitamente por staff |

Ver el detalle de cada tabla en [05-base-de-datos.md](05-base-de-datos.md) y de cada endpoint en [06-api.md](06-api.md).
