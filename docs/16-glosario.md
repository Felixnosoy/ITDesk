# 16. Glosario

Términos de negocio y del dominio de ITDesk, en el sentido exacto en que se usan en el código y en esta documentación.

**Actualización** — Entrada de la bitácora pública de un ticket: un cambio de estado registrado por staff, con una observación opcional. No cambia por sí sola el `estado` real del ticket (eso ocurre en endpoints dedicados de `ticket`); es puramente un registro histórico. Distinta de una **nota privada**, que nunca es visible para el cliente.

**Administrador** — Rol con acceso más amplio del sistema: superset de los permisos del Técnico, más gestión de usuarios, reportes, auditoría completa y operaciones destructivas (`DELETE`).

**Asignación** — Registro que vincula un ticket con un técnico "sugerido" como responsable. No es un control de acceso: cualquier técnico puede trabajar cualquier ticket, esté o no asignado a él.

**Auditoría** — Log automático de eventos relevantes del sistema (crear ticket, aprobar cotización, resetear contraseña, etc.), generado internamente por los servicios — nunca por un endpoint público. Un fallo al registrar un evento de auditoría nunca bloquea la acción de negocio que lo originó.

**Categoría** — Clasificación de un ticket por tipo de problema: `Hardware`, `Software`, `Red` u `Otro`. Obligatoria al crear el ticket, validada contra un enum de backend.

**Cliente** — Rol que representa al dueño del equipo que se lleva a reparar. Nunca crea ni modifica tickets por sí mismo; siempre lo hace el staff tras un reporte presencial. Puede consultar sus tickets, aprobar/rechazar cotizaciones, ver facturas y calificar el servicio.

**Cotización** — Propuesta de costo de un servicio, dirigida a un cliente, compuesta por una o más líneas de detalle (mano de obra, repuestos, descuento). Pasa por los estados `Pendiente` → `Aprobada`/`Rechazada`/`Vencida`. Solo el cliente (o un Administrador en su representación) puede aprobarla o rechazarla — nunca el técnico que hizo el diagnóstico.

**Diagnóstico** — Evaluación técnica escrita por un Técnico sobre la causa del problema de un ticket, con solución propuesta opcional. Un ticket tiene como máximo un diagnóstico (crear uno nuevo sobre el mismo ticket sobrescribe al anterior). Requisito obligatorio antes de poder cotizar un ticket.

**Equipo** — El dispositivo físico (PC, laptop, impresora, etc.) que un cliente lleva a reparar, identificado por número de serie único. Siempre pertenece a un usuario con rol Cliente.

**Encuesta de satisfacción** — Calificación de 1 a 5 estrellas con comentario opcional que el cliente deja sobre un ticket, únicamente después de que ese ticket quede `Cerrado`. Una sola calificación por ticket, sin posibilidad de edición posterior.

**Estado (de ticket)** — `Abierto` → `En proceso` → `Resuelto` → `Cerrado`. `Cerrado` es terminal (no admite más cambios). Pasar a `Resuelto` exige una cotización aprobada y facturada, salvo declarar explícitamente que el trabajo fue "sin costo".

**Estado (de usuario)** — `Activo`/`Inactivo`. Funciona como *soft-delete*: un usuario inactivo no puede iniciar sesión, pero sus datos y su historial no se borran.

**Factura** — Documento de cobro generado a partir de una cotización `Aprobada`, en una relación 1 a 1 (una cotización solo puede facturarse una vez). Copia ("snapshot") los montos y líneas de la cotización en el momento de generarse — no se recalcula si la cotización cambiara después (aunque en la práctica ya no puede, por estar bloqueada fuera de `Pendiente`). Pasa por los estados `Pendiente` → `Pagada`/`Anulada`/`Vencida`.

**ITSM** — *IT Service Management*, gestión de servicios de TI: la categoría de sistema a la que pertenece ITDesk — cubre el ciclo completo de un caso de soporte técnico, no solo el registro de tickets.

**JWT** — *JSON Web Token*, el mecanismo de autenticación del sistema. Firmado por el backend al hacer login, contiene únicamente `id_usuario` y `rol` (más metadata estándar de expiración), y se envía en cada petición protegida vía el header `Authorization: Bearer <token>`.

**Nota privada** — Comentario interno de staff sobre un ticket, nunca visible para el cliente. Distinta de una **actualización**, que sí puede llegar a ser visible según tenga observaciones o no.

**Prioridad** — Urgencia declarada de un ticket: `Alta`, `Media` o `Baja` por convención del frontend (sin enum de backend que lo obligue).

**Recepcionista** — Rol de menor alcance del sistema: recibe al cliente en persona, registra clientes nuevos, equipos y tickets. No participa en el trabajo técnico ni tiene acceso al detalle de un ticket individual.

**Rol** — Uno de los 4 tipos de cuenta del sistema: `Administrador`, `Tecnico`, `Cliente`, `Recepcionista`. Determina tanto qué endpoints puede llamar un usuario (backend) como qué ve la interfaz (frontend).

**Solución** — Campo opcional del diagnóstico donde el técnico describe cómo se resolvió (o se propone resolver) el problema.

**Técnico** — Rol operativo del sistema: diagnostica, cotiza, factura y resuelve tickets. Ve la cola completa de trabajo, no solo los tickets "asignados" a él.

**Ticket** — La entidad central del sistema: un caso de soporte que vincula a un cliente con un equipo, con prioridad, categoría, estado y fechas de apertura/resolución/cierre. De un ticket cuelgan casi todas las demás entidades (diagnóstico, cotización, factura, notas, adjuntos, notificaciones, auditoría).
