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

## Recorrido típico de una visita técnica

A diferencia de un ticket (siempre creado por staff), una visita técnica nace de una solicitud del propio Cliente — pero el ticket que la respalda sigue naciendo recién cuando staff confirma, preservando la regla de que el cliente nunca crea un ticket directamente:

```mermaid
flowchart TD
    A["Cliente solicita una visita<br/>POST /api/visita-tecnica — especialidad, fecha/hora, dirección, motivo"] --> B["Estado inicial: Pendiente"]
    B --> C["Recepción/Administrador revisa la agenda<br/>(agenda-visitas.html) y consulta disponibilidad<br/>GET /visita-tecnica/disponibilidad"]
    C --> D["Confirma la visita: asigna técnico<br/>PATCH /visita-tecnica/:id/confirmar"]
    D --> E{"¿La visita ya tenía<br/>un ticket vinculado?"}
    E -->|No| F["Se crea un ticket nuevo<br/>con un equipo del cliente<br/>(o se vincula uno existente)"]
    E -->|Sí| G["Se usa el ticket ya vinculado"]
    F --> H["Estado: Confirmada"]
    G --> H
    H --> I["Técnico marca En camino<br/>PATCH /visita-tecnica/:id/estado"]
    I --> J["Técnico marca En progreso"]
    J --> K["Técnico registra diagnóstico<br/>en el ticket vinculado<br/>POST /api/diagnostico"]
    K --> L["Técnico marca Finalizada<br/>(exige el diagnóstico ya registrado)"]
    L --> M["A partir de acá, cotización/factura/cierre<br/>del ticket siguen el flujo normal de ticket<br/>(ver diagrama de arriba)"]

    B -.->|Recepción reprograma| N["Estado: Reprogramada<br/>PATCH .../reprogramar"]
    N -.-> C
    B -.->|Cliente o staff cancela| O["Estado: Cancelada (terminal)"]
    H -.->|Staff cancela| O
```

### Notas sobre el diagrama

- **La visita no duplica diagnóstico/solución**: esos campos viven en el `ticket` vinculado, reusando los módulos ya existentes en vez de crear un circuito de facturación paralelo. `visita_tecnica.observaciones` es distinto — son notas del técnico sobre la visita en sí (ej. "cliente no estaba en el horario acordado"), no el diagnóstico técnico.
- **`Reprogramada` es un desvío, no un estado final**: cambia fecha/hora y vuelve a pedir confirmación (mismo endpoint `/confirmar`).
- **Cancelar tiene alcance distinto por rol**: el Cliente solo puede cancelar su propia visita mientras siga `Pendiente`/`Confirmada`; Recepción/Administrador pueden en cualquier estado no terminal. Ver [api/visita-tecnica.md](api/visita-tecnica.md).
- **Disponibilidad es informativa, no bloqueante**: el endpoint de disponibilidad muestra horarios ya ocupados por especialidad+fecha, pero no impide crear una visita en un horario que se solape — el chequeo real queda a criterio de Recepción al confirmar.

## Ciclo de vida de una visita técnica

```mermaid
stateDiagram-v2
    [*] --> Pendiente: solicitud del cliente
    Pendiente --> Confirmada: staff confirma, asigna tecnico y ticket
    Pendiente --> Reprogramada: staff reprograma
    Pendiente --> Cancelada: cliente o staff cancela
    Confirmada --> Reprogramada: staff reprograma
    Confirmada --> EnCamino: tecnico avanza el estado
    Confirmada --> Cancelada: staff cancela
    Reprogramada --> Confirmada: staff confirma de nuevo
    EnCamino --> EnProgreso: tecnico avanza el estado
    EnCamino --> Cancelada: staff cancela
    EnProgreso --> Finalizada: exige diagnostico ya registrado en el ticket
    EnProgreso --> Cancelada: staff cancela
    Finalizada --> [*]: estado final
    Cancelada --> [*]: estado final

    EnCamino: En camino
    EnProgreso: En progreso
```

## Trazabilidad: qué queda registrado en cada paso

| Evento del flujo | Dónde queda |
|---|---|
| Casi cualquier acción relevante (crear ticket, cerrar, asignar, aprobar cotización, cambiar factura, eliminar archivo, calificar, solicitar/confirmar/reprogramar/reasignar/cancelar/avanzar una visita técnica) | `auditoria` — automático, fire-and-forget, nunca bloquea la acción principal (`id_ticket` o `id_visita` según corresponda) |
| Cambios de estado del ticket con comentario | `actualizacion` — log público, visible al cliente si tiene `observaciones` |
| Comentarios internos del staff | `nota_privada` — nunca visible al cliente |
| Avisos puntuales a un usuario | `notificacion` — nunca automático, siempre creado explícitamente por staff |

Ver el detalle de cada tabla en [05-base-de-datos.md](05-base-de-datos.md) y de cada endpoint en [06-api.md](06-api.md).
