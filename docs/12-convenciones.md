# 12. Convenciones del proyecto

Estas convenciones no están escritas en un linter ni forzadas por herramientas — se infieren del código real, consistente a lo largo de los 18 recursos del backend y las 23 pantallas del frontend. Seguirlas es lo que mantiene el proyecto predecible para alguien nuevo.

## Backend

### Nombres de archivo y carpetas

Un recurso = 3 archivos con el mismo nombre base, cada uno en su carpeta:
```
routes/ticket.routes.js
controllers/ticket.controller.js
services/ticket.service.js
```
`camelCase` para nombres compuestos (`detalleCotizacion.routes.js`, `notaPrivada.routes.js`), pero el prefijo de URL montado en `app.js` usa `kebab-case` (`/api/detalle-cotizacion`, `/api/notas`).

### Módulos

`CommonJS` (`require`/`module.exports`) en todo el backend — no hay ESM (`import`/`export`). Cada archivo de servicio exporta un objeto con sus funciones (`module.exports = { crear, obtenerTodos, ... }`), salvo `health.service.js`, que exporta la función directamente (inconsistencia real que causa el bug descrito en [14-problemas-conocidos.md](14-problemas-conocidos.md)).

### Nombres de variables y campos

- Español para nombres de dominio (`usuario`, `ticket`, `contraseña`, `id_usuario`) — el proyecto no traduce sus conceptos de negocio al inglés en ningún lado, ni en el código ni en la base de datos.
- `snake_case` para columnas de base de datos y para las claves de los objetos JSON que viajan por la API (`id_ticket`, `fecha_apertura`).
- `camelCase` para variables y funciones de JavaScript (`crearUsuario`, `verificarTicketFacturado`).

### Manejo de errores

Patrón único en los 18 controllers:
```js
const metodo = async (req, res) => {
    try {
        const resultado = await service.metodo(...);
        responder(res, 200, { message: "...", data: resultado });
    } catch (error) {
        responder(res, error.status || 500, { message: error.message });
    }
};
```
Los servicios lanzan errores de negocio con `crearError(mensaje, status)` (`backend/src/utils/`), nunca con `throw new Error(...)` plano cuando el error tiene un status HTTP asociado. No hay `next(error)` hacia un middleware de errores global — no existe uno (ver [14-problemas-conocidos.md](14-problemas-conocidos.md)).

### Validación

Manual, sin librería (`express-validator` está en `package.json` pero no se usa en ningún archivo real — dependencia muerta). El patrón repetido es:
```js
if (!campoObligatorio) throw crearError("Todos los campos obligatorios son requeridos.", 400);
```
al principio de cada función de servicio que crea/actualiza algo. Las verificaciones de existencia de una entidad relacionada (¿existe el cliente?, ¿existe el ticket?) se centralizan en `backend/src/validators/usuario.validator.js` cuando aplican a `usuario` — el resto de las verificaciones de existencia (ticket, cotización, factura, etc.) están duplicadas dentro de cada service, no centralizadas.

### SQL

SQL crudo parametrizado vía `pool.query(sql, [params])` — sin ORM, sin *query builder*. Siempre parámetros posicionales (`?`), nunca interpolación de strings en el SQL (evita inyección). No se usan transacciones explícitas (`pool.getConnection()` + `BEGIN`/`COMMIT`) en ningún service, ni siquiera en operaciones multi-query como copiar líneas de cotización a factura — ver [14-problemas-conocidos.md](14-problemas-conocidos.md), hallazgo O.

## Frontend

### Nombres de archivo

Un script por pantalla, mismo nombre base que el HTML (`ticket-cliente.html` → `ticket-cliente.js`), salvo `login.html` → `script.js` (inconsistencia heredada, documentada en [10-frontend.md](10-frontend.md)).

### Sin módulos ES, sin bundler

Los scripts se cargan como `<script src="js/archivo.js"></script>` planos, en orden, y comparten el espacio global — no hay `import`/`export`, no hay `webpack`/`vite`/similar. El orden de carga importa: la infraestructura compartida (`api.js`, `auth.js`, `ui.js`, `layout.js`) siempre va antes que el script propio de la pantalla.

### Un único punto de red

Ningún script llama `fetch` directamente — todo pasa por `apiFetch` (`js/api.js`). Ningún script maneja el header `Authorization` a mano.

### Filtrado y orden, siempre client-side

Como la API no acepta query params de filtrado, cualquier pantalla nueva que necesite filtrar/ordenar/paginar debe hacerlo en memoria sobre el array ya traído, reutilizando `Search`, `Ordenar` y `UI.paginarRender` — no inventar un mecanismo nuevo por pantalla.

### CSS

Todo color, tipografía, espaciado, radio de borde y sombra sale de una *custom property* definida en `tokens.css` — nunca un valor hex/px suelto directamente en `style.css` o en un `<style>` inline. Los componentes de Bootstrap (`.modal-content`, `.offcanvas`, `.nav-tabs`, etc.) **no siguen el `[data-theme]` del proyecto automáticamente** — cada vez que se usa un componente de Bootstrap nuevo hay que revisar si necesita overrides explícitos de tema en `style.css` (bug recurrente ya documentado en el proyecto).

## Comentarios en el código

El estilo dominante es comentarios cortos que explican el *porqué* de una decisión no obvia (por ejemplo, por qué un campo se toma del JWT y no del body), no *qué* hace el código línea por línea. Varios archivos tienen un comentario de una línea al principio explicando una decisión de alcance (por ejemplo, "Cliente nunca tiene acceso a ninguna ruta de este modulo").

## Tests

`backend/tests/services/`, un archivo por servicio cubierto, con el pool de MySQL mockeado (`jest.mock("../../src/config/database")`, `pool.query.mockResolvedValueOnce(...)`) — nunca contra una base de datos real. Correr con `npm test` desde `backend/`.
