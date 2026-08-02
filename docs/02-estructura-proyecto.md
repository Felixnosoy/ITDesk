# 2. Estructura del proyecto

```
itdesk/
├── backend/                   API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/            Conexión a la base de datos (pool mysql2)
│   │   │   └── __mocks__/     Mock del pool, usado por Jest
│   │   ├── constants/         Valores fijos de negocio (roles, estados, categorías)
│   │   ├── controllers/       Un archivo por recurso: recibe req/res, delega al service
│   │   ├── middleware/        Autenticación (JWT) y verificación de rol
│   │   ├── routes/            Un archivo por recurso: define método+URL+middleware+controller
│   │   ├── services/          Lógica de negocio y acceso a datos (SQL) por recurso
│   │   ├── utils/             Helpers compartidos (respuesta HTTP, creación de errores)
│   │   ├── validators/        Validaciones manuales reutilizadas entre servicios
│   │   ├── app.js             Configura Express, monta los 18 routers
│   │   └── server.js          Punto de entrada: carga .env y levanta el servidor HTTP
│   ├── tests/
│   │   └── services/          Tests unitarios Jest (un archivo por servicio cubierto)
│   ├── uploads/                Carpeta física de archivos adjuntos subidos (no versionada)
│   ├── .env                   Variables de entorno locales (no versionado)
│   └── package.json
│
├── frontend/                  Interfaz web (HTML/CSS/JS estático, sin build)
│   ├── css/
│   │   ├── tokens.css         Fuente única de verdad del sistema de diseño (color, tipografía, espaciado, radios, sombras)
│   │   └── style.css          Componentes (~40 bloques: cards, tablas, badges, kanban, etc.)
│   ├── js/
│   │   ├── api.js             apiFetch() — wrapper único de fetch contra el backend
│   │   ├── auth.js            Sesión (JWT) en sessionStorage, control de acceso por rol
│   │   ├── ui.js               Helpers de presentación (badges, paginación, count-up, etc.)
│   │   ├── layout.js           Arma sidebar/topbar/footer según rol, notificaciones, búsqueda global
│   │   ├── search.js            Buscador client-side genérico
│   │   ├── ordenar.js           Ordenamiento client-side de tablas
│   │   ├── codigos.js           Códigos legibles (TCK-2026-000037, etc.)
│   │   ├── imprimir.js          Renderizado de documentos imprimibles
│   │   └── <pantalla>.js        Un script por página (cliente.js, tecnico.js, admin.js, etc.)
│   ├── img/                    Recursos gráficos estáticos
│   └── *.html                  23 páginas (una por pantalla; ver sección 10)
│
├── base de datos/
│   └── schema.sql              Definición completa del esquema (15 tablas, MariaDB/InnoDB)
│
├── docs/                        Esta documentación
│
├── .gitignore
├── LICENSE
└── README.md                    Punto de entrada del repositorio
```

## Responsabilidad de cada carpeta

### `backend/src/config`
Un único archivo relevante, `database.js`, que crea el pool de conexiones (`mysql2/promise`) a partir de las variables de entorno. `__mocks__/database.js` es el mock que usa Jest para no requerir una base de datos real en los tests.

### `backend/src/constants`
Listas de valores válidos de negocio, usadas tanto para validar en los servicios como para no repetir strings literales por el código: `roles.js`, `estadosUsuario.js`, `estadosTicket.js`, `estadosCotizacion.js`, `estadosFactura.js`, `categoriasTicket.js`, `estadosEquipo.js` (vacío a propósito, ver [14-problemas-conocidos.md](14-problemas-conocidos.md)). No todos los campos "tipo enum" tienen su constante — `ticket.prioridad` no tiene una, ver el mismo archivo.

### `backend/src/middleware`
Dos archivos: `auth.middleware.js` (verifica el JWT y llena `req.usuario`) y `rol.middleware.js` (una *factory* que devuelve un middleware que exige que `req.usuario.rol` esté en una lista permitida). Se explican en detalle en [07-autenticacion.md](07-autenticacion.md).

### `backend/src/routes` / `controllers` / `services`
El trío que define cada uno de los 18 recursos de la API. Un archivo de cada tipo por recurso, mismo nombre base (`ticket.routes.js` / `ticket.controller.js` / `ticket.service.js`). El detalle línea por línea de qué hace cada endpoint está en [06-api.md](06-api.md).

### `backend/src/utils`
`respuesta.js` — el helper `responder(res, status, {message, data})` que arma el contrato `{ success, message?, data? }` que devuelven todos los endpoints. `error.js` (o equivalente) — `crearError(mensaje, status)`, usado para lanzar errores de negocio con un código HTTP asociado, capturados por el `try/catch` de cada controller.

### `backend/src/validators`
`usuario.validator.js` — funciones compartidas de verificación de existencia (`verificarUsuarioExiste`, `verificarClienteExiste`, `verificarTecnicoExiste`, `verificarStaffExiste`), usadas como guardas al principio de varios servicios para no repetir el mismo `SELECT` de comprobación en cada uno.

### `frontend/css`
`tokens.css` es la única fuente de valores de diseño (colores, tipografía, radios, sombras, densidad) como *custom properties* — organizado en primitivos → semánticos → alias heredados, con bloques por tema (claro/oscuro) y por rol (`[data-rol="cliente|tecnico|admin|recepcion"]`). `style.css` consume esas variables para construir los componentes visuales. Ver el detalle del sistema de diseño en [10-frontend.md](10-frontend.md).

### `frontend/js`
Se divide en dos grupos:
- **Infraestructura compartida** (`api.js`, `auth.js`, `ui.js`, `layout.js`, `search.js`, `ordenar.js`, `codigos.js`, `imprimir.js`): sin estas, ninguna pantalla protegida funciona. Cargadas por casi todas las páginas.
- **Scripts de pantalla** (`cliente.js`, `tecnico.js`, `admin.js`, `recepcion.js`, `reporte-*.js`, etc.): lógica específica de una página, cargados solo ahí.

### `base de datos/`
Contiene únicamente `schema.sql` — el `CREATE TABLE` completo de las 15 tablas. No hay archivo de datos semilla versionado en el repositorio.

### `docs/`
Esta documentación. `docs/api/` contiene el detalle endpoint por endpoint de cada recurso de la API (ver [06-api.md](06-api.md) para el índice).
