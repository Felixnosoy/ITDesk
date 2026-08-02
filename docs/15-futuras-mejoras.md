# 15. Futuras mejoras

Lista de mejoras razonables a partir de brechas y decisiones ya identificadas en el código y documentadas en este mismo repositorio de documentación — no son funcionalidades inventadas, sino continuaciones naturales de gaps reales encontrados en la auditoría (capítulo 14) o de alcance explícitamente pospuesto durante el desarrollo del proyecto.

## Prioridad alta

- **Corregir `GET /api/health`.** Es el único endpoint pensado para diagnóstico de infraestructura y hoy siempre devuelve `500` por dos bugs de importación/variable (ver [14-problemas-conocidos.md](14-problemas-conocidos.md), hallazgo A). Sin esto, no hay forma confiable de verificar por API que la conexión a la base de datos está sana.
- **Agregar un middleware de manejo de errores global** (y un handler 404) en `backend/src/app.js`. Hoy toda la robustez depende de que cada controller tenga su propio `try/catch` — cualquier error que escape de ese patrón cae en el manejador por defecto de Express, que rompe el contrato JSON `{ success, message }` del resto de la API (hallazgo G).
- **Resolver `DELETE /api/usuarios/:id`.** Está marcado en el propio código como "no usar" pero sigue expuesto y accesible para cualquier Administrador. O se retira del todo (queda `PATCH /estado` como único mecanismo de baja), o se blinda con manejo explícito de las FK relacionadas y un mensaje de error claro en vez de un `500` genérico (hallazgo B).

## Prioridad media

- **Envío de correo electrónico** — confirmaciones de ticket creado, avisos de cambio de estado, recuperación de contraseña por correo. Deliberadamente pospuesto durante el desarrollo (no hay infraestructura SMTP configurada); hoy el reseteo de contraseña es 100% manual vía Administrador.
- **Seguimiento de SLA / tiempos de respuesta** — fechas límite por prioridad, alertas de tickets vencidos. Deliberadamente pospuesto durante el desarrollo; hoy no existe ningún concepto de "vencimiento" en el sistema más allá de las fechas de apertura/resolución/cierre.
- **Transacciones explícitas en operaciones multi-query.** `crearFactura` (copia de líneas de cotización a factura) y las cascadas manuales de borrado de cotización/factura corren como secuencias de queries independientes sobre el pool, sin `BEGIN`/`COMMIT` — un fallo a mitad de camino puede dejar datos parcialmente escritos sin posibilidad de rollback automático (hallazgo O).
- **Centralizar la validación de entrada**, tal como ya señalan 3 comentarios `TODO` idénticos en el propio código (`auth.service.js`, `equipo.service.js`, `usuario.service.js`). Implicaría decidir entre adoptar de verdad `express-validator` (ya está en las dependencias, sin uso) o formalizar el patrón manual actual en una capa compartida.
- **Columna de "última actualización" en `ticket`.** Se evaluó durante el desarrollo del panel de filtros del técnico y se dejó fuera a propósito por requerir un cambio de esquema + escribirla en cada endpoint que muta un ticket. Si se vuelve una necesidad real de negocio, es un cambio acotado pero transversal.
- **Notificaciones y KPIs en tiempo real.** Hoy todo funciona por *polling* (45s notificaciones, 60s KPIs del dashboard admin) porque no hay websockets en el proyecto — una mejora evidente si la carga de usuarios concurrentes crece.

## Prioridad baja

- **Decidir el destino de `express-validator`**: removerla de `package.json` si no se va a adoptar, para no dejar una dependencia declarada sin uso real (hallazgo E).
- **Revisar si `GET /api/detalle-factura` (bulk, sin filtro) sigue siendo necesario** — no se encontró ningún consumidor de esa variante en el frontend actual (hallazgo H).
- **Estandarizar los prefijos de `Codigos.reporte()`** — hoy conviven `RPT-*` con `RSL`, `EQP` y `NOT` sin el prefijo común, cada uno documentado como intencional pero inconsistente de cara a un lector nuevo.
- **Unificar el status code de "recurso no encontrado"** en `usuario.service.js`, donde conviven `404` y `409` para el mismo caso según la función (hallazgo C).
