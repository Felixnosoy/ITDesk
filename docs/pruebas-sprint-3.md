# Pruebas del Sprint 3

Resultado: **32 casos de aceptación aprobados** en navegador, **79 pruebas de integración** contra la API y MySQL reales y **182 pruebas unitarias del backend**, todas en verde. Ejecución del 6 de octubre de 2026.

## Alcance

Historias HU14 a HU17 del Sprint 3: crear una cotización, aprobarla o rechazarla, generar la factura y pagarla en línea. Corresponden a las subtareas de pruebas HU14.6, HU15.5, HU16.5 y HU17.6.

Las pruebas de HU18 (impresión), HU19 (despliegue) y HU26 (privilegios de la base de datos) se agregan a este documento cuando se hagan.

## Entorno

- Backend Node/Express con MySQL y frontend React con Vite, levantados en local.
- Navegador Chrome automatizado, en escritorio (1280 px) y en móvil (400 px de ancho).
- Base de datos creada desde cero con `base de datos/schema.sql` y `base de datos/datos-prueba.sql`. Cada caso crea sus propios tickets, así no depende de lo que dejó otro.

| Rol | Cuenta de prueba |
| --- | --- |
| Administrador | administrador.prueba@itdesk.test |
| Recepcionista | recepcionista.prueba@itdesk.test |
| Técnico | tecnico.prueba@itdesk.test |
| Cliente | cliente.prueba@itdesk.test |
| Cliente | maria.gomez@correo.test |

## Pruebas automáticas

### Unitarias del backend

Se ejecutan con `npm test` dentro de `backend/`.

| Suite | Pruebas | Cubre |
| --- | --- | --- |
| cotizacion.service | 28 | Validación de líneas, total en centavos, diagnóstico obligatorio, una sola cotización vigente, decisión del cliente |
| factura.service | 6 | Solo se factura la cotización aprobada, copia de líneas y montos, una factura por ticket |
| pago.service | 16 | Tarjetas de prueba, vencimiento, CVV, rechazo sin cambios, factura ya pagada |
| Suites de los sprints 1 y 2 | 132 | Login, usuarios, middleware, tickets, equipos, diagnóstico, avances, archivos y estados |

### Integración

Se ejecutan con `npm run test:integracion` dentro de `backend/`. Levantan la API real contra una base aparte (`itdesk_test`) creada desde cero.

| Suite | Pruebas | Cubre |
| --- | --- | --- |
| cotizaciones | 32 | Camino completo de HU14 a HU17 y los permisos de cada rol |
| cotizaciones.limites | 11 | Clics simultáneos, montos con decimales, ids cruzados entre clientes (detalle abajo) |
| tickets.listado y tickets.visibilidad | 36 | Suites del Sprint 2, siguen en verde |

`cotizaciones.limites` cubre lo que el camino normal no prueba:

| Caso | Historia |
| --- | --- |
| El total coincide con la suma de las líneas con precios como 0.10 x 3 y 33.33 x 3, comprobado en la base y no solo en la respuesta | HU14 |
| El importe y el total que mande el frontend se ignoran | HU14 |
| Sin diagnóstico no se guarda nada y el ticket sigue Abierto | HU14 |
| Dos cotizaciones enviadas a la vez dejan solo una | HU14 |
| Un cliente no decide sobre la cotización de otro aunque use su propio ticket en la dirección | HU15 |
| Aprobar y rechazar a la vez deja una sola decisión y el ticket en el estado que le corresponde | HU15 |
| La factura iguala al total de la cotización y a la suma de sus líneas, comprobado en la base | HU16 |
| Después de un rechazo se factura la cotización nueva, no la rechazada | HU16 |
| Dos clics en Generar factura a la vez dejan una sola factura | HU16 |
| Un segundo pago se rechaza y no cambia la referencia ni la fecha del primero | HU17 |
| Dos pagos enviados a la vez cobran una sola vez | HU17 |

Para confirmar que las pruebas de clics simultáneos detectan el problema, se quitó a propósito el bloqueo de fila (`FOR UPDATE`) de la factura y del pago: esas pruebas fallaron en las 3 corridas. Con el código real pasan; la suite completa se corrió 5 veces seguidas sin fallas.

## Casos de aceptación

### HU14 — Crear una cotización

| Caso | Resultado |
| --- | --- |
| Sin diagnóstico no aparece la tarjeta de cotización y se explica por qué | Aprobado |
| Con diagnóstico el técnico ve Crear cotización | Aprobado |
| Una línea sin descripción no se envía y se marca el error en esa línea | Aprobado |
| Agregar líneas actualiza el total al instante, exacto al centavo con decimales | Aprobado |
| Quitar una línea del medio recalcula el total y no mueve los textos de las demás | Aprobado |
| Al enviar se avisa y el ticket pasa a Esperando aprobación | Aprobado |
| El total que guardó el servidor es el mismo que se vio en pantalla | Aprobado |
| Con una cotización pendiente ya no se ofrece crear otra | Aprobado |
| Recepción ve la cotización pero no puede cotizar | Aprobado |

### HU15 — Aprobar o rechazar mi cotización

| Caso | Resultado |
| --- | --- |
| El cliente ve las líneas y los botones Aprobar y Rechazar | Aprobado |
| La confirmación muestra el total; Volver no cambia nada | Aprobado |
| Rechazar con motivo deja el ticket En diagnóstico y muestra el motivo | Aprobado |
| Tras el rechazo el técnico arma una nueva y la anterior queda en el historial | Aprobado |
| Al aprobar el ticket pasa a En reparación y se ve la fecha de la decisión | Aprobado |
| Otro cliente que abre la URL del ticket recibe "no encontrado" y no ve botones | Aprobado |
| Si ya se decidió en otra pestaña, el segundo intento muestra el error y no cambia la decisión | Aprobado |

### HU16 — Generar la factura

| Caso | Resultado |
| --- | --- |
| Con la cotización pendiente no aparece la factura ni el botón para generarla | Aprobado |
| Con la cotización aprobada el técnico ve Generar factura | Aprobado |
| La confirmación muestra el total de la cotización aprobada | Aprobado |
| La factura sale con su número FAC, las mismas líneas y el mismo total de la cotización | Aprobado |
| Una vez emitida ya no se ofrece generarla otra vez | Aprobado |
| El cliente ve su factura Pendiente y no puede generarla | Aprobado |

### HU17 — Pagar una factura en línea

| Caso | Resultado |
| --- | --- |
| El formulario vacío marca los 4 campos | Aprobado |
| El número y el vencimiento toman formato mientras se escribe; sin autocompletado | Aprobado |
| La tarjeta de rechazo muestra el error y la factura sigue Pendiente | Aprobado |
| Una tarjeta que no es de prueba se rechaza con el aviso de modo de prueba | Aprobado |
| Con la tarjeta 4242 queda Pagada y se ve el comprobante con referencia, monto y últimos 4 dígitos | Aprobado |
| Al recargar sigue Pagada y no se ofrece pagar de nuevo | Aprobado |
| Un segundo pago desde otra pestaña abierta se rechaza y el comprobante no cambia | Aprobado |
| El técnico ve la factura Pagada sin botón de pago | Aprobado |

### Móvil (400 px)

| Caso | Resultado |
| --- | --- |
| El detalle con cotización y factura pagada no se desborda | Aprobado |
| El formulario de pago cabe en la pantalla | Aprobado |
| El editor de cotización no desborda la página | Aprobado |

En la consola del navegador solo aparecieron las respuestas de error que los casos provocan a propósito (404, 409, 402 y 400); ningún error de la aplicación.

## Defectos encontrados

Ninguno.
