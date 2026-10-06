# API de cotizaciones, facturas y pagos

Endpoints del Sprint 3 para las pantallas de HU14 a HU18. Todas las rutas empiezan con `/api`, piden el token y responden con el formato de siempre (`{ success, message, data }`). Los códigos de error son los mismos de [api-tickets.md](api-tickets.md), más uno nuevo:

| Código | Significa |
| --- | --- |
| 402 | El pago fue rechazado (tarjeta de rechazo). No se cobró nada. |
| 409 | Ya hecho: cotización ya decidida, factura ya emitida o ya pagada, otra cotización vigente. |

## Resumen

| Método | Ruta | Roles | Para |
| --- | --- | --- | --- |
| GET | `/tickets/:id/cotizaciones` | Todos | HU14 consultar |
| POST | `/tickets/:id/cotizaciones` | Administrador, Técnico | HU14 crear |
| PATCH | `/tickets/:id/cotizaciones/:idCotizacion` | Cliente | HU15 aprobar o rechazar |
| GET | `/tickets/:id/factura` | Todos | HU16 consultar |
| POST | `/tickets/:id/factura` | Administrador, Técnico | HU16 generar |
| POST | `/tickets/:id/factura/pago` | Cliente | HU17 pagar |

Como en el resto de tickets, el Cliente solo puede usar estas rutas con sus propios tickets. Con uno ajeno recibe 404.

**No hace falta llamar a los GET para la pantalla del ticket.** `GET /tickets/:id` ya trae todo (ver abajo). Los GET sueltos sirven si alguna pantalla necesita solo eso.

## El flujo

```
Diagnóstico  ->  Técnico crea cotización  ->  Cliente decide
                 (ticket: Esperando aprobacion)
                                               |-- Aprueba  -> ticket: En reparacion -> Técnico genera factura -> Cliente paga
                                               |-- Rechaza  -> ticket: En diagnostico -> Técnico puede crear otra
```

Los cambios de estado del ticket los hace el backend solo y quedan en la línea de tiempo. El frontend no tiene que llamar a `PATCH /estado` en ningún paso de este flujo.

## Novedades en el detalle del ticket

`GET /tickets/:id` suma tres claves:

```json
{
  "ticket": { },
  "diagnostico": { },
  "cotizable": false,
  "cotizaciones": [ { "...": "la más nueva primero" } ],
  "factura": null,
  "facturable": true,
  "actualizaciones": [ ]
}
```

- **`cotizaciones`**: todas las del ticket, con sus líneas, de la más nueva a la más vieja. La primera es la actual; las demás son el historial (por ejemplo una rechazada). Lista vacía si no hay.
- **`cotizable`** cambió: ahora es `true` solo si se puede crear una cotización **en este momento**: hay diagnóstico, el ticket no está Resuelto ni Cerrado, y no hay otra Pendiente o Aprobada. Usarlo para mostrar u ocultar el botón "Crear cotización".
- **`factura`**: la factura del ticket o `null`.
- **`facturable`** (solo para el taller, no llega al Cliente): `true` si hay una cotización aprobada sin facturar. Usarlo para el botón "Generar factura".

## La cotización

```json
{
  "id_cotizacion": 7,
  "id_ticket": 15,
  "id_usuario": 3,
  "creada_por": "Tecnico Prueba",
  "estado": "Pendiente",
  "subtotal": 6000.5,
  "itbis": 1080.09,
  "total": 7080.59,
  "observaciones": null,
  "motivo_rechazo": null,
  "fecha_creacion": "2026-10-05T14:02:11.000Z",
  "fecha_decision": null,
  "lineas": [
    { "id_linea": 1, "id_cotizacion": 7, "descripcion": "Placa madre", "cantidad": 1, "precio_unitario": 4500, "importe": 4500 },
    { "id_linea": 2, "id_cotizacion": 7, "descripcion": "Mano de obra", "cantidad": 2, "precio_unitario": 750.25, "importe": 1500.5 }
  ]
}
```

- `estado`: `Pendiente`, `Aprobada` o `Rechazada`.
- Los montos llegan como **número**, no como texto.
- `motivo_rechazo` y `fecha_decision` se llenan cuando el cliente decide.

## HU14: crear una cotización

`POST /tickets/:id/cotizaciones`

```json
{
  "lineas": [
    { "descripcion": "Placa madre", "cantidad": 1, "precio_unitario": 4500 },
    { "descripcion": "Mano de obra", "cantidad": 2, "precio_unitario": 750.25 }
  ],
  "observaciones": "opcional"
}
```

- **El total lo calcula el servidor.** Si se manda `importe` o `total`, se ignora. Para el total en vivo del editor (HU14.4) usar la misma fórmula:
  - `importe = cantidad × precio_unitario`
  - `subtotal = suma de importes`
  - `itbis = subtotal × 0.18`, redondeado a 2 decimales
  - `total = subtotal + itbis`
- Reglas por línea: `descripcion` obligatoria (máx. 255), `cantidad` entero de 1 a 999, `precio_unitario` de 0 a 999999.99 con hasta 2 decimales. Entre 1 y 30 líneas. Si una línea está mal, el mensaje dice cuál, por ejemplo `"El campo cantidad de la línea 2 debe ser..."`.
- **400** si el ticket no tiene diagnóstico o está Resuelto o Cerrado.
- **409** si ya hay una cotización Pendiente o Aprobada.
- **201** con la cotización creada. El ticket pasa a `Esperando aprobacion`; volver a pedir el detalle para ver el nuevo estado.

## HU15: aprobar o rechazar

`PATCH /tickets/:id/cotizaciones/:idCotizacion`

```json
{ "estado": "Aprobada" }
{ "estado": "Rechazada", "motivo": "opcional" }
```

- Solo el Cliente dueño. El personal del taller recibe 403.
- `Aprobada`: el ticket pasa a `En reparacion`.
- `Rechazada`: guarda el motivo y el ticket vuelve a `En diagnostico`. Desde ahí el técnico puede crear otra cotización (`cotizable` vuelve a `true`).
- **409** si la cotización ya fue decidida.
- **200** con la cotización actualizada.
- La confirmación previa (HU15.4) es del frontend; el backend no la pide.

Mientras haya una cotización Pendiente, el técnico **no puede** sacar el ticket de `Esperando aprobacion` con `PATCH /estado` (responde 400). Solo la decisión del cliente lo mueve.

## La factura

```json
{
  "id_factura": 4,
  "id_cotizacion": 7,
  "id_ticket": 15,
  "id_usuario": 3,
  "emitida_por": "Tecnico Prueba",
  "subtotal": 6000.5,
  "itbis": 1080.09,
  "total": 7080.59,
  "estado": "Pendiente",
  "fecha_emision": "2026-10-05T15:10:00.000Z",
  "fecha_pago": null,
  "referencia_pago": null,
  "tarjeta_ultimos4": null,
  "lineas": [
    { "id_linea": 1, "descripcion": "Placa madre", "cantidad": 1, "precio_unitario": 4500, "importe": 4500 }
  ]
}
```

`estado` es `Pendiente` o `Pagada`. Al pagarse se llenan `fecha_pago`, `referencia_pago` (por ejemplo `PAG-3F9A1C02BD`) y `tarjeta_ultimos4`.

## HU16: generar la factura

`POST /tickets/:id/factura`, sin cuerpo.

- Copia los montos y las líneas de la cotización aprobada. No se manda nada más.
- **400** si no hay cotización aprobada (pendiente o rechazada no sirven) o si el ticket está Cerrado.
- **409** si ya tiene factura.
- **201** con la factura. Deja en la línea de tiempo "Se emitió la factura del trabajo.".
- **Regla de cierre:** con la factura emitida, `PATCH /estado` a `Resuelto` ya funciona sin `sin_costo`. No hace falta que esté pagada.

`GET /tickets/:id/factura` responde 404 si el ticket todavía no tiene factura.

## HU17: pagar en línea

`POST /tickets/:id/factura/pago`

```json
{
  "numero_tarjeta": "4242 4242 4242 4242",
  "titular": "Cliente Prueba",
  "vencimiento": "12/30",
  "cvv": "123"
}
```

El pago es **simulado**. Solo acepta estas tarjetas de prueba (con o sin espacios o guiones):

| Tarjeta | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | Aprobada |
| `4000 0000 0000 0002` | Rechazada (402) |

- Cualquier otro número responde 400 pidiendo usar la de prueba. Conviene mostrar la tarjeta de prueba en la pantalla.
- `vencimiento` en formato `MM/AA` y no vencida. `cvv` de 3 o 4 dígitos, **como texto** (`"123"`).
- Solo el Cliente dueño. **409** si ya está pagada. **404** si el ticket no tiene factura.
- **200** con la factura ya `Pagada`. Del pago solo se guardan la referencia, la fecha y los últimos 4 dígitos; para el comprobante (HU17.5) usar esos campos.

## Datos de prueba

`base de datos/datos-prueba.sql` ahora trae un ticket en cada situación (contraseña `Prueba123!`):

| Ticket | Cliente | Situación |
| --- | --- | --- |
| Atasco de papel | cliente.prueba | Una rechazada y otra pendiente (para probar aprobar/rechazar y el historial) |
| Bateria no carga | maria.gomez | Cotización pendiente |
| Ventilador ruidoso | maria.gomez | Aprobada, falta generar la factura |
| Sin conexion a internet | cliente.prueba | Facturada, falta pagar |
| Teclado con teclas muertas | cliente.prueba | Resuelto, factura pendiente de pago |
| Instalar controlador | cliente.prueba | Cerrado, factura pagada |

Para tenerlos hay que volver a correr `schema.sql` y `datos-prueba.sql` en la base local (ver el README).
