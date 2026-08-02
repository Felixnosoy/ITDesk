# 11. Guía para desarrolladores

Esta guía explica cómo extender el sistema siguiendo exactamente los mismos patrones que ya usan los 18 recursos existentes. No hay generadores de código ni CLI propia — todo se escribe a mano siguiendo la convención.

## Cómo agregar un endpoint nuevo a un recurso existente

Ejemplo: agregar `GET /api/ticket/:id/resumen`.

1. **Ruta** (`backend/src/routes/ticket.routes.js`): agregar la línea con el middleware que corresponda.
   ```js
   router.get("/:id/resumen", verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), ticketController.obtenerResumen);
   ```
   Si el endpoint necesita quedar público (sin `autenticarToken`), tiene que ir en un archivo de rutas aparte que **no** llame `router.use(autenticarToken)` — ver `estadisticas.routes.js` como referencia; no se puede "saltear" el middleware para una sola ruta dentro de un archivo que ya lo aplica globalmente.

2. **Controller** (`backend/src/controllers/ticket.controller.js`): función delgada, solo orquesta.
   ```js
   const obtenerResumen = async (req, res) => {
       try {
           const resumen = await ticketService.obtenerResumen(req.params.id);
           responder(res, 200, { data: resumen });
       } catch (error) {
           responder(res, error.status || 500, { message: error.message });
       }
   };
   ```

3. **Service** (`backend/src/services/ticket.service.js`): toda la lógica y el SQL viven acá.
   ```js
   const obtenerResumen = async (id) => {
       const [rows] = await pool.query("SELECT ... FROM ticket WHERE id_ticket = ?", [id]);
       if (rows.length === 0) throw crearError("Ticket no encontrado", 404);
       return rows[0];
   };
   ```

4. **Exportar** la nueva función en `module.exports` del controller y del service.

5. **Tests** (`backend/tests/services/ticket.service.test.js`): agregar un caso, mockeando `pool.query` (ver la sección de convenciones de test más abajo).

6. **Documentar** el endpoint nuevo en `docs/api/ticket.md`, siguiendo el mismo formato que los endpoints existentes (roles, body, respuesta, errores).

## Cómo agregar un recurso nuevo por completo

Igual que el flujo anterior, pero creando los 3 archivos desde cero: `<recurso>.routes.js`, `<recurso>.controller.js`, `<recurso>.service.js`, y montando el router nuevo en `backend/src/app.js`:

```js
const miRecursoRoutes = require("./routes/miRecurso.routes");
app.use("/api/mi-recurso", miRecursoRoutes);
```

Si el recurso necesita un enum de valores fijos (como `estado` o `categoria` en otros recursos), agregar el archivo correspondiente en `backend/src/constants/`.

## Cómo agregar una tabla nueva a la base de datos

1. Escribir el `ALTER TABLE`/`CREATE TABLE` y **avisar explícitamente al equipo antes de aplicarlo** — cualquier cambio de esquema es una operación que afecta a todos los que tengan una base local o de staging.
2. Seguir las convenciones ya establecidas (ver [12-convenciones.md](12-convenciones.md) y [05-base-de-datos.md](05-base-de-datos.md)): nombre de tabla en singular y `snake_case`, PK `id_<tabla>`, columnas FK con el mismo nombre que la PK referenciada, fechas como `DATETIME` con `DEFAULT current_timestamp()`, montos como `DECIMAL(10,2)`, estados como `varchar` (no `ENUM`) validados en `backend/src/constants/`.
3. Actualizar `base de datos/schema.sql` para que siga siendo la fuente única del esquema completo (el proyecto no usa un sistema de migraciones versionadas — el `schema.sql` es el estado actual, no un historial incremental).
4. Documentar la tabla nueva en [05-base-de-datos.md](05-base-de-datos.md), incluyendo su entrada en el diagrama Mermaid.

## Cómo agregar un módulo/componente nuevo al frontend

Para una **pantalla nueva**:

1. Copiar el esqueleto de `data-protegido`/`app-shell` de cualquier página protegida existente (ver [03-arquitectura.md](03-arquitectura.md) para el HTML exacto).
2. Crear `js/<nombre-pantalla>.js` con la lógica de la pantalla, cargando siempre después de `api.js`, `auth.js`, `ui.js`, `layout.js` (y `search.js`/`ordenar.js`/`codigos.js`/`imprimir.js` si la pantalla los necesita).
3. Usar `apiFetch` para toda comunicación con el backend — nunca `fetch` directo.
4. Reutilizar los helpers de `ui.js` para badges, paginación, estados de carga/vacío/error, en vez de reimplementarlos.
5. Si la pantalla necesita una tabla ordenable, cablearla con `Ordenar.conectar`; si necesita filtrado de texto libre, usar `Search.filtrar`/`Search.conectar` (ver el panel de filtros de `dashboard-tecnico.html` como ejemplo de un patrón de filtrado más rico, combinable, no solo texto libre).
6. Agregar el link correspondiente en `NAV_POR_ROL` (`js/layout.js`) para el/los rol(es) que deban verlo.

Para un **componente visual nuevo** (una card, un badge, un estado): definir sus colores/espaciados a partir de las *custom properties* de `tokens.css`, nunca con valores hex sueltos directamente en `style.css` — así el componente hereda automáticamente el tema claro/oscuro y la identidad visual por rol sin código adicional.

## Checklist antes de dar por terminado un cambio de backend

- [ ] La lógica de negocio está en el service, no en el controller ni en la ruta.
- [ ] Los errores se lanzan con `crearError(mensaje, status)` y el controller los captura con el `try/catch` estándar.
- [ ] La respuesta usa `responder(res, status, { message, data })`.
- [ ] Si el endpoint expone datos de un usuario, se decidió explícitamente si necesita `verificarRol` o control de ownership manual (y se implementó uno de los dos, nunca ninguno).
- [ ] `cd backend && npm test` pasa.
- [ ] El endpoint nuevo o modificado está reflejado en `docs/api/<recurso>.md`.
