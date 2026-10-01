# Pruebas del Sprint 2

Resultado: **83 casos de aceptación aprobados** en navegador (verificados con 123 comprobaciones automáticas), **36 pruebas de integración** contra la API y MySQL reales y **125 pruebas unitarias del backend**, todas en verde. Ejecución del 1 de octubre de 2026.

## Alcance

Historias HU08 a HU13 del Sprint 2: registro de tickets desde Recepción, listado, detalle, avances con evidencia, diagnóstico y cambio de estado.

HU07 (reportar un ticket como cliente) pasó al Sprint 3 en el cierre de este sprint. Está pendiente decidir si el cliente puede reportar tickets desde el sistema, porque hoy los registra el personal después de que el cliente reporta el problema en persona. De HU07 se hizo en este sprint la parte que sí se usa: las tablas de equipo y ticket (HU07.1).

## Entorno

- Backend Node/Express con MySQL, en `http://localhost:3000`.
- Frontend React con Vite, en `http://localhost:5173`.
- Navegador Chromium automatizado, en escritorio (1280 px) y en móvil (400 px de ancho).
- Base de datos creada desde cero con `base de datos/schema.sql` y `base de datos/datos-prueba.sql`: 2 clientes, 5 equipos y 12 tickets, 2 en cada estado.

| Rol | Cuenta de prueba |
| --- | --- |
| Administrador | administrador.prueba@itdesk.test |
| Recepcionista | recepcionista.prueba@itdesk.test |
| Técnico | tecnico.prueba@itdesk.test |
| Cliente | cliente.prueba@itdesk.test |
| Cliente | maria.gomez@correo.test |

## Pruebas automáticas

### Unitarias del backend

Se ejecutan con `npm test` dentro de `backend/`. Los servicios trabajan contra una base de datos simulada, así que no dependen de MySQL.

| Suite | Pruebas | Cubre |
| --- | --- | --- |
| ticket.service | 13 | Alcance del listado por rol y filtros por estado, prioridad y categoría |
| ticket.crearTicket | 15 | Validaciones, cliente y técnico activos, equipo del cliente, transacción confirmada y deshecha |
| usuario.buscarClientes | 7 | Búsqueda mínima de 2 caracteres, solo clientes activos, comodines escapados |
| equipo.service | 18 | Alta y consulta de equipos, serie repetida, cliente inactivo |
| diagnostico.service | 5 | Registro, reemplazo del diagnóstico vigente, ticket cerrado |
| seguimiento.service | 7 | Avances y notas, autor del token, imagen falsa, transacción deshecha |
| archivo.service | 10 | Tipo de imagen por su contenido, permisos de descarga por rol |
| detalle.service | 4 | Detalle completo, cliente sin notas privadas, ticket ajeno |
| estado.service | 18 | Tabla de transiciones, diagnóstico obligatorio, regla de cierre, fechas |
| Suites del Sprint 1 | 28 | Login, usuarios y middleware de token y rol |

### Integración

Se ejecutan con `npm run test:integracion` dentro de `backend/`. Levantan la API real contra una base aparte (`itdesk_test`) creada desde cero.

| Suite | Pruebas | Cubre |
| --- | --- | --- |
| tickets.listado (HU09.6) | 19 | Cada cliente ve solo lo suyo, el personal ve todo, cada filtro devuelve exactamente su subconjunto, valores inválidos responden 400 |
| tickets.visibilidad (HU10.6) | 17 | El cliente no abre tickets ajenos, no recibe notas privadas ni sus imágenes y no escribe en el ticket |

## Casos de aceptación

### HU08 — Registrar un ticket a nombre de un cliente

| Caso | Resultado |
| --- | --- |
| Recepción tiene Registrar ticket en el menú | Aprobado |
| El técnico no puede abrir Registrar ticket | Aprobado |
| La búsqueda pide al menos 2 caracteres | Aprobado |
| Encuentra al cliente por apellido | Aprobado |
| Encuentra al cliente por documento | Aprobado |
| Sin resultados invita a registrar un cliente nuevo | Aprobado |
| El alta rápida de cliente no muestra el rol | Aprobado |
| Un correo repetido muestra el error en la ventana | Aprobado |
| El cliente nuevo queda elegido y ya aparece en la búsqueda | Aprobado |
| Cambiar de cliente vuelve a la búsqueda | Aprobado |
| El paso de equipo está inactivo sin cliente | Aprobado |
| Muestra los equipos del cliente elegido | Aprobado |
| Un número de serie repetido muestra el error | Aprobado |
| El equipo nuevo queda elegido y aparece en la lista | Aprobado |
| Un cliente sin equipos ve el formulario de alta abierto | Aprobado |
| El paso del problema está inactivo sin equipo | Aprobado |
| Solo ofrece técnicos activos, con su especialidad | Aprobado |
| Sin técnico el ticket no se puede enviar | Aprobado |
| Al registrar lleva al detalle con la confirmación y el código | Aprobado |
| El ticket nace Abierto con los datos enviados | Aprobado |
| El ticket nuevo aparece en el listado de Recepción | Aprobado |
| La clienta lo ve en Mis tickets | Aprobado |

### HU09 — Ver la lista de tickets que me corresponden

| Caso | Resultado |
| --- | --- |
| El menú tiene Tickets | Aprobado |
| El técnico ve los 12 tickets del taller | Aprobado |
| El cliente ve "Mis tickets" con solo sus 7 tickets | Aprobado |
| El cliente no ve la columna Cliente | Aprobado |
| La primera página tiene 10 filas y la segunda las 2 restantes | Aprobado |
| El filtro por estado deja solo los tickets de ese estado | Aprobado |
| La búsqueda por texto encuentra un ticket por su título | Aprobado |
| Limpiar filtros vuelve a mostrar todo | Aprobado |
| Ordenar por prioridad descendente empieza por Alta | Aprobado |
| Clic en el código abre el detalle del ticket | Aprobado |
| Solo Recepción ve el botón Registrar ticket | Aprobado |
| En móvil la página no se desborda horizontalmente | Aprobado |

### HU10 — Ver el detalle completo de un ticket

| Caso | Resultado |
| --- | --- |
| El detalle se abre desde el listado | Aprobado |
| Muestra diagnóstico, equipo y número de serie | Aprobado |
| Un ticket inexistente muestra "Ticket no encontrado" | Aprobado |
| El taller ve las notas privadas y el dato del cliente | Aprobado |
| El cliente no ve las notas privadas | Aprobado |
| El texto de las notas privadas no llega al navegador del cliente | Aprobado |
| Sin diagnóstico el cliente lee un mensaje pensado para él | Aprobado |
| Otro cliente que escribe la URL a mano recibe "no encontrado" | Aprobado |
| La línea de tiempo muestra lo más reciente primero | Aprobado |
| El cliente ve los avances públicos y los cambios de estado | Aprobado |
| Un ticket sin novedades lo indica | Aprobado |
| En móvil el detalle no se desborda horizontalmente | Aprobado |

### HU11 — Registrar avances de un ticket con evidencia

| Caso | Resultado |
| --- | --- |
| El taller ve Registrar novedad | Aprobado |
| La imagen elegida muestra una vista previa | Aprobado |
| Una captura pegada con Ctrl+V se agrega con un nombre legible | Aprobado |
| Un PDF se rechaza antes de subir | Aprobado |
| Un archivo disfrazado de imagen lo rechaza el servidor y se muestra el motivo | Aprobado |
| El avance rechazado no se registra | Aprobado |
| Se puede quitar una imagen antes de enviar | Aprobado |
| No deja adjuntar más de 5 imágenes | Aprobado |
| El avance aparece en la línea de tiempo y el formulario queda limpio | Aprobado |
| La nota privada aparece en Notas privadas | Aprobado |
| El servidor guarda las 5 imágenes del avance y la de la nota | Aprobado |
| Las miniaturas cargan con la sesión del usuario | Aprobado |
| El visor muestra la imagen en grande con su nombre original | Aprobado |
| El visor se cierra con Escape y con la X | Aprobado |
| El cliente ve las imágenes de los avances de su ticket | Aprobado |
| El cliente no recibe la imagen de la nota privada | Aprobado |
| El cliente no ve el formulario ni la nota privada | Aprobado |

### HU12 — Registrar el diagnóstico técnico

| Caso | Resultado |
| --- | --- |
| Sin diagnóstico el ticket queda marcado como no cotizable | Aprobado |
| No se puede guardar un diagnóstico vacío | Aprobado |
| El diagnóstico guardado se muestra en el detalle | Aprobado |
| La edición trae los valores actuales | Aprobado |
| Un diagnóstico editado queda marcado como "(editado)" | Aprobado |
| Un ticket cerrado ya no permite diagnosticar | Aprobado |
| El cliente ve el diagnóstico pero no puede editarlo | Aprobado |

### HU13 — Cambiar el estado de un ticket

| Caso | Resultado |
| --- | --- |
| Desde Abierto solo se ofrece En diagnóstico | Aprobado |
| Sin elegir estado no se puede confirmar | Aprobado |
| El cambio se refleja en la cabecera | Aprobado |
| El comentario entra en la línea de tiempo | Aprobado |
| Esperando aprobación aparece bloqueado sin diagnóstico, con el motivo | Aprobado |
| Al elegir Resuelto se explica la regla de cierre | Aprobado |
| Resuelto sin cotización ni excepción lo bloquea el servidor y se muestra el motivo | Aprobado |
| Declarando "sin costo" el ticket pasa a Resuelto | Aprobado |
| El resumen y la línea de tiempo dejan escrita la excepción sin costo | Aprobado |
| Desde Resuelto se ofrece Cerrado o volver a En reparación | Aprobado |
| Un ticket cerrado ya no ofrece cambiar de estado | Aprobado |
| Recepción y el cliente no pueden cambiar estados | Aprobado |
| En móvil la ventana de cambiar estado cabe en la pantalla | Aprobado |

Además, en las 12 corridas del navegador no apareció ningún error en la consola.

## Defectos encontrados y corregidos

- **Aviso con datos viejos:** después de guardar un diagnóstico, un avance o un cambio de estado, el aviso "guardado" aparecía un instante antes de que se actualizara la pantalla. Ahora se vuelve a pedir el detalle antes de mostrar el aviso.
- **Mensaje técnico al usuario:** el mensaje de bloqueo de la regla de cierre mencionaba el nombre interno del campo (`sin_costo`). Ahora dice "decláralo como trabajo sin costo".
- **Vistas previas en desarrollo:** las vistas previas de las imágenes elegidas fallaban al volver a dibujarse en modo desarrollo, porque la dirección temporal de la imagen se liberaba antes de tiempo. Ahora se crea y se libera en el mismo paso.
- **Tabla muy ancha:** en el listado, a 1280 px, la columna de apertura quedaba cortada. Se ajustaron márgenes, fechas e insignias para que la tabla entre completa.
