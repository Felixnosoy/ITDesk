# 8. Roles del sistema

El sistema tiene **4 roles** (`backend/src/constants/roles.js`): `Administrador`, `Tecnico`, `Cliente`, `Recepcionista`. El rol viaja en el JWT y determina tanto qué endpoints puede llamar un usuario (backend, fuente de verdad) como qué ve la interfaz (frontend, reflejo de esas reglas).

## Cliente

El dueño de los equipos que se llevan a reparar. **Nunca crea ni modifica tickets** — siempre llega en persona y el staff registra el caso.

Puede:
- Consultar el estado de sus propios tickets (`GET /ticket/mis`) y su historial de novedades públicas (`GET /actualizacion/notas/:id`).
- Ver y aprobar/rechazar sus propias cotizaciones (`GET/PATCH /cotizacion/mis/...`).
- Ver y descargar sus propias facturas (`GET /factura/mis/...`).
- Ver y descargar sus propios archivos adjuntos **marcados como públicos** (`GET /archivos/mis/ticket/:id`).
- Calificar un ticket propio una vez cerrado (`POST /encuestas`, una sola vez).
- Editar su propio perfil (solo teléfono y dirección) y cambiar su propia contraseña.
- Solicitar una visita técnica presencial (`POST /visita-tecnica`) y ver/cancelar las propias (`GET /visita-tecnica/mis`, `PATCH /visita-tecnica/:id/cancelar` mientras siga `Pendiente`/`Confirmada`) — pero **no crea un ticket al hacerlo**: el ticket nace recién cuando Recepción/Administrador confirma la visita.

No puede: crear ni ver el detalle completo de un ticket por id (solo el listado `/mis`), ver diagnóstico, ver notas privadas, ver archivos marcados como privados, ver quién del staff escribió una nota (el log que sí ve nunca incluye el nombre del autor), ver el listado completo de visitas técnicas de otros clientes.

**Pantallas**: `dashboard-cliente.html`, `historial.html`, `documentos.html`, `ticket-cliente.html`, `agendar-visita.html`, `mis-visitas.html`, `perfil.html` (compartida con los demás roles).

## Técnico

Hace el trabajo operativo del ticket: diagnostica, cotiza, factura, resuelve.

Puede: prácticamente todo lo que puede un Administrador en el flujo operativo — crear/leer/actualizar tickets, asignaciones, diagnósticos, actualizaciones (log), cotizaciones, líneas de cotización (incluso borrarlas — el único `DELETE` no exclusivo de Administrador en todo el sistema), facturas, notificaciones, notas privadas, archivos.

No puede: aprobar/rechazar cotizaciones en nombre del cliente (`PATCH /cotizacion/:id/estado` es exclusivo de Administrador — esa decisión es del cliente, o de un Administrador actuando en su representación administrativa, no del técnico), ver el listado global de encuestas (`GET /encuestas` es exclusivo de Administrador), ni ninguna operación `DELETE` salvo la de líneas de cotización.

**Ve todos los tickets del sistema, no solo los "suyos"**: `GET /api/ticket` no filtra por técnico asignado. El módulo `asignacion` existe como registro de "especialista sugerido", no como control de acceso — la restricción de que un técnico solo viera sus propios tickets asignados existió en algún momento solo en el frontend y fue removida deliberadamente (ver [15-futuras-mejoras.md](15-futuras-mejoras.md) si se quisiera reintroducir como opción).

**Visitas técnicas**: ve y avanza el estado únicamente de las visitas que tiene asignadas (`GET /visita-tecnica/tecnico/mis`, `PATCH /visita-tecnica/:id/estado`) — `En camino` → `En progreso` → `Finalizada`, esta última exige que el ticket vinculado ya tenga diagnóstico registrado. No puede confirmar, reprogramar, reasignar ni cancelar una visita (eso es de Recepción/Administrador), salvo la excepción de que Administrador comparte todos sus propios permisos.

**Pantallas**: `dashboard-tecnico.html`, `detalle-ticket.html` (compartida con Administrador), `mis-visitas-tecnico.html`, `auditoria.html` (compartida con Administrador), `perfil.html`.

## Administrador

Superset de los permisos de Técnico, más:

- Gestión completa de usuarios (crear cualquier rol, activar/desactivar, resetear contraseñas, editar).
- Es el único rol habilitado para operaciones destructivas (`DELETE`) en usuario, equipo, asignación, diagnóstico, actualización, cotización, factura, notificación y archivo.
- Único rol para aprobar/rechazar cotizaciones del lado de staff (`PATCH /cotizacion/:id/estado`) y para ver el listado completo de encuestas (`GET /encuestas`).
- Acceso a los 8 reportes y a la auditoría completa del sistema.
- Único rol, junto con Recepcionista, que puede confirmar/reprogramar/reasignar/cancelar visitas técnicas y gestionar el catálogo de especialidades (crear/renombrar/eliminar, y asignárselas a un técnico).

**Pantallas**: `dashboard-admin.html`, `usuarios.html`, `detalle-ticket.html`, `agenda-visitas.html`, `auditoria.html`, `reportes.html` + 8 reportes individuales, `perfil.html`.

## Recepcionista

El rol de menor alcance. Recibe al cliente en persona y da de alta lo necesario para abrir un caso.

Puede: crear usuarios (**forzado siempre a `rol = Cliente`**, sin importar qué rol venga en la petición — es una regla aplicada en el propio controller, no algo que dependa de la interfaz), listar/crear equipos, crear tickets y listar tickets (incluyendo por usuario).

No puede: ver el detalle de un ticket individual por id (`GET /ticket/:id` no incluye este rol — ni siquiera los tickets que él mismo registró), ni tocar diagnóstico, cotización, factura, asignación, notas privadas o notificación.

Esta es una asimetría real y deliberada del sistema: Recepcionista no tiene página de detalle de ticket en el frontend. Su pantalla `dashboard-recepcion.html` compensa parcialmente con una "consulta rápida" (typeahead que muestra estado y tiempo abierto de un ticket buscado), pero no hay *drill-down* real al estilo `detalle-ticket.html`.

**Sí coordina las visitas técnicas**: junto con Administrador, es quien confirma (asigna técnico y equipo/ticket), reprograma, reasigna y cancela visitas desde `agenda-visitas.html` — el único módulo nuevo donde Recepcionista tiene más alcance que Técnico.

**Pantallas**: `dashboard-recepcion.html`, `recepcion.html`, `agenda-visitas.html`, `perfil.html`.

## Matriz resumida de acceso a recursos

| Recurso | Cliente | Recepcionista | Tecnico | Administrador |
|---|:---:|:---:|:---:|:---:|
| Usuarios (crear) | ❌ | ✅ (forzado a Cliente) | ❌ | ✅ |
| Usuarios (listar/editar) | solo el propio | ✅ | ✅ (editar) | ✅ |
| Equipos | ❌ | crear/listar | ✅ | ✅ |
| Tickets (crear) | ❌ | ✅ | ✅ | ✅ |
| Tickets (detalle por id) | ❌ (solo listado propio) | ❌ | ✅ | ✅ |
| Diagnóstico | ❌ | ❌ | ✅ | ✅ |
| Notas privadas | ❌ | ❌ | ✅ | ✅ |
| Cotización (crear/editar líneas) | ❌ | ❌ | ✅ | ✅ |
| Cotización (aprobar/rechazar) | ✅ (la propia) | ❌ | ❌ | ✅ |
| Factura (generar/cambiar estado) | ❌ | ❌ | ✅ | ✅ |
| Encuesta de satisfacción | ✅ (la propia, ticket cerrado) | ❌ | ❌ (solo lectura por ticket) | ✅ (lectura + listado completo) |
| Auditoría | ❌ | ❌ | ✅ (lectura) | ✅ (lectura) |
| Operaciones `DELETE` | ❌ | ❌ | solo líneas de cotización | ✅ |
| Especialidades (catálogo) | lectura | lectura | lectura | ✅ (CRUD) |
| Visita técnica (solicitar) | ✅ (la propia) | ❌ | ❌ | ❌ |
| Visita técnica (confirmar/reprogramar/reasignar) | ❌ | ✅ | ❌ | ✅ |
| Visita técnica (avanzar estado propio) | ❌ | ❌ | ✅ (la asignada) | ✅ |
| Visita técnica (cancelar) | ✅ (la propia, no terminal) | ✅ | ❌ | ✅ |

Esta tabla resume; el detalle exacto de middleware por endpoint está en `docs/api/*.md`.
