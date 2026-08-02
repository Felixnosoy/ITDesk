# 13. Dependencias

## Backend (`backend/package.json`)

### Dependencias de producción

| Paquete | Versión | Para qué se usa |
|---|---|---|
| `express` | `^5.2.1` | Framework HTTP — enrutamiento, middleware, parseo de request/response. Toda la API está construida sobre él. |
| `mysql2` | `^3.22.6` | Driver de MySQL/MariaDB. Se usa su API de promesas (`mysql2/promise`) para el pool de conexiones y las queries (`pool.query`). |
| `jsonwebtoken` | `^9.0.3` | Firma y verificación de los JWT de sesión (`jwt.sign` en el login, `jwt.verify` en el middleware de autenticación). |
| `bcrypt` | `^6.0.0` | Hash y verificación de contraseñas (`bcrypt.hash` al crear/cambiar contraseña, `bcrypt.compare` al hacer login). |
| `multer` | `^2.2.0` | Middleware de subida de archivos multipart — usado únicamente en `POST /api/archivos`, con almacenamiento en disco (`diskStorage`). |
| `cors` | `^2.8.6` | Habilita peticiones cross-origin desde el frontend (que se sirve en un origen/puerto distinto al backend). Montado globalmente en `app.js` sin configuración restrictiva. |
| `dotenv` | `^17.4.2` | Carga las variables de `.env` a `process.env` al arrancar (`server.js`). |
| `express-validator` | `^7.3.2` | **Declarada pero sin ningún uso real en el código fuente** (verificado con búsqueda de texto en todo `backend/src`) — toda la validación del proyecto es manual. Dependencia muerta, candidata a remover o a adoptarse de verdad (hay un `TODO` en el código sobre centralizar validaciones). |

### Dependencias de desarrollo

| Paquete | Versión | Para qué se usa |
|---|---|---|
| `jest` | `^30.4.2` | Framework de testing. Corre los tests de `backend/tests/services/` con el pool de MySQL mockeado. |
| `nodemon` | `^3.1.14` | Reinicia el servidor automáticamente al detectar cambios en archivos durante desarrollo (`npm run dev`). |

## Frontend

Sin `package.json` — nada se instala vía npm en el frontend. Todo se carga desde CDN (`jsdelivr`) o Google Fonts:

| Recurso | Para qué se usa |
|---|---|
| Bootstrap 5.3.7 (CSS + JS bundle) | Grid, componentes base (modales, offcanvas, tabs, dropdowns) y utilidades, sobre los que se monta el sistema de diseño propio (`tokens.css`/`style.css`). |
| Bootstrap Icons 1.13.1 | Iconografía en toda la interfaz (`<i class="bi bi-...">`). |
| Chart.js 4 | Gráficos (doughnut de estado, barras de categoría, barras de satisfacción) — cargado únicamente en `reporte-estadisticas.html`, ninguna otra pantalla lo necesita. |
| Google Fonts — Inter (texto) + IBM Plex Mono (código/identificadores) | Tipografía del sistema de diseño. |

No hay bundler, transpilador ni gestor de paquetes de frontend — los archivos `.js`/`.css` se sirven tal cual.

## Base de datos

MySQL o MariaDB (el `schema.sql` fue exportado desde MariaDB 10.4). No hay una librería de migraciones — el esquema se aplica cargando `base de datos/schema.sql` directamente.
