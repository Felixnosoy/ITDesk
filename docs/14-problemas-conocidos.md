# 14. Problemas conocidos

Este capítulo consolida todo lo que se detectó como bug real, código incompleto, inconsistencia o deuda técnica al auditar el proyecto para esta documentación — verificado línea por línea contra el código fuente, no supuesto. Se agrupa por área y, donde aplica, con severidad aproximada.

## Backend

### 🔴 Bugs reales (afectan el comportamiento en producción)

**A. `GET /api/health` está roto y siempre devuelve 500.** Dos bugs combinados: `health.service.js` exporta la función directamente (`module.exports = checkDataBase`) pero el controller la importa como si fuera un objeto con métodos (`healthService.checkDataBase()`, que es `undefined`); y el controller referencia una variable `rows` que nunca se declaró. Resultado: toda llamada cae en el `catch` y responde `500 "Error al conectar con la base de datos"` sin importar el estado real de la conexión. Ver [api/health.md](api/health.md).

**B. `DELETE /api/usuarios/:id` está marcado en el propio código como "solo para datos de pruebas (no se debe usar)".** Hard delete sin manejo de las FK entrantes desde 11 tablas distintas — borrar un usuario con cualquier historial relacionado muy probablemente lanza un error de constraint no capturado (`500` genérico). Usar `PATCH /api/usuarios/:id/estado` (`Inactivo`) para dar de baja un usuario en la práctica.

### 🟡 Inconsistencias reales (funcionan, pero de forma irregular)

**C. Status code duplicado para "no encontrado" en `usuario.service.js`.** `obtenerUsuarioPorId` (usado por `GET /:id`) lanza `409` en vez de `404`; `verificarUsuarioExiste` (usado por el resto de operaciones sobre usuario) sí lanza `404` para el mismo caso.

**D. `usuario.service.crearUsuario` no valida campos obligatorios**, a diferencia de todos los demás `crear*` del sistema. Si falta `contraseña`, falla con un error de bajo nivel de `bcrypt`, no un `400` limpio.

**L. Asimetría de permisos en `PATCH /api/cotizacion/:id/estado`**: excluye a Tecnico (solo Administrador), pese a que Tecnico tiene los mismos permisos que Administrador en el resto de operaciones de cotización.

**N. `POST /api/equipo` devuelve columnas distintas a las lecturas del mismo recurso** — la respuesta de creación no incluye el campo `cliente` (no hace `JOIN`), a diferencia de `GET`/`PUT`.

**P. Mensajes de error con espacio final inconsistente**: `"El numero de documento ya esta registrado. "` tiene un espacio final literal, `"El correo ya esta registrado."` no.

**M. `encuesta.service.js` compara contra el string literal `"Cerrado"`** en vez de importar `ESTADOS_TICKET.CERRADO` como hace el resto del código — mismo resultado, inconsistencia de estilo.

**I. Naming confuso en `equipo.controller.js`**: el service se importa como `const equipoController = require("../services/equipo.service")` — la variable dice "controller" pero apunta al service.

### 🟢 Deuda técnica reconocida en el propio código

**E. `express-validator` está declarada pero sin ningún uso real** en el código fuente.

**F. 3 comentarios `TODO` idénticos** (`auth.service.js`, `equipo.service.js`, `usuario.service.js`): extraer las validaciones manuales a una capa de validadores dedicada.

**G. No hay middleware de manejo de errores global ni handler 404 en `app.js`.** Todo depende de que cada controller tenga su propio `try/catch` (se cumple, verificado) — pero sin red de seguridad arquitectónica: cualquier error no atrapado antes de llegar a un controller cae en el manejador por defecto de Express, que devuelve HTML, no el contrato JSON `{ success, message }` del resto de la API.

**O. Sin transacciones explícitas en operaciones multi-query.** Por ejemplo, `crearFactura` copia las líneas de `detalle_cotizacion` a `detalle_factura` en un loop secuencial sin `BEGIN`/`COMMIT` — si la conexión fallara a mitad de camino, quedaría una factura con solo algunas líneas copiadas, sin rollback automático. Aplica en general: ningún service usa `pool.getConnection()` + transacciones.

**Q. `estadosEquipo.js` está vacío a propósito** — `equipo.estado` es texto libre sin validación, a diferencia de todos los demás campos "estado" del sistema.

### Asimetrías de alcance (posiblemente intencionales, pero notables)

**J. `diagnostico` es el único módulo satélite de ticket sin ninguna ruta accesible por Cliente**, ni siquiera de solo lectura sobre su propio ticket.

**K. No existe un "ver mi ticket por id" para el Cliente** — solo tiene el listado `GET /ticket/mis`. Recepcionista, que sí puede crear y listar tickets, tampoco tiene acceso al detalle por id.

**H. `GET /api/detalle-factura` (bulk, sin filtro) parece no tener consumidor en el frontend actual** — no se encontró ninguna pantalla que lo llame. Candidato a revisar si sigue siendo necesario.

## Base de datos

**`ON DELETE` inconsistente en las FK hacia `usuario`.** La mayoría no especifican `ON DELETE` (default `RESTRICT`), pero `equipo.id_usuario`, `archivo_adjunto.id_usuario` y `notificacion.id_usuario` sí usan `CASCADE`, sin que el schema documente el criterio.

**Asimetría `detalle_cotizacion.id_ticket` (CASCADE) vs `detalle_factura.id_ticket` (sin ON DELETE)**, pese a ser tablas estructuralmente paralelas.

**`UNIQUE KEY` duplicada en `equipo.numero_serie`** (`UQ_Equipo_Serie` + un índice autogenerado) — redundante, no afecta integridad.

**Sin columna de "última modificación" en `ticket`.** Cualquier funcionalidad que necesite filtrar/ordenar por "actualizado recientemente" requeriría una columna nueva.

**`ticket.prioridad` no tiene constante de backend** — su set de valores (`Alta`/`Media`/`Baja`) es solo convención de frontend, sin enforcement de servidor.

Ver el detalle completo de estas y otras 4 particularidades menores en [05-base-de-datos.md](05-base-de-datos.md), sección 5.5.

## Frontend

**`reporte-estadisticas.js` no retematiza los gráficos de Chart.js en caliente** — los colores se leen de las *custom properties* una sola vez al cargar; si el usuario alterna modo claro/oscuro sin recargar la página, el gráfico se queda con la paleta vieja. Limitación reconocida en el propio comentario del archivo.

**Recepcionista no tiene página de detalle de ticket** (`detalle-ticket.html` está protegida solo para `Tecnico,Administrador`). La "consulta rápida" de `dashboard-recepcion.html` compensa parcialmente pero no hay *drill-down* real. Decisión de alcance ya tomada, no un olvido, pero es una asimetría de cobertura real entre roles.

**Prefijos de `Codigos.reporte()` inconsistentes entre reportes**: la mayoría usa `RPT-XXX`, pero Resueltos usa `RSL`, Equipos usa `EQP` y Notificaciones usa `NOT`. Intencional según el propio comentario del código ("cada salida usa su propia familia"), pero se lee como falta de estándar único.

**`js/script.js` (login.html) no sigue la convención `<pantalla>.js`** del resto de los scripts — inconsistencia de nomenclatura heredada, no un bug.

No se encontraron archivos JS sin ninguna página que los cargue, bloques de código comentado dejando funcionalidad a medio implementar, ni `TODO`/`FIXME` pendientes en el frontend.

## Higiene del repositorio (fuera del código de la aplicación)

Al momento de escribir esta documentación se encontró que el `README.md` de la raíz del repositorio contenía por error contenido de `.gitignore` (reglas de exclusión, no una descripción del proyecto), mientras que el `.gitignore` real de la raíz estaba vacío. **No representó una fuga de datos real** — se verificó que `node_modules/` no está trackeado (`git ls-files`) y que `backend/.env` está correctamente protegido por un `.gitignore` propio dentro de `backend/`. El `.gitignore` de la raíz ya fue corregido como parte de este trabajo de documentación; este `README.md` fue reemplazado por una portada real del proyecto que enlaza a esta documentación.
