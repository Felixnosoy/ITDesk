# 4. Instalación

## Requisitos

| Herramienta | Notas |
|---|---|
| Node.js | 18 o superior (Express 5 lo requiere). Este entorno de desarrollo usa Node 24. |
| npm | Se instala junto con Node. |
| MySQL o MariaDB | El esquema fue exportado desde MariaDB 10.4. Cualquier MySQL/MariaDB moderno compatible con `utf8mb4` funciona. |
| Un servidor de archivos estáticos | El frontend no tiene build ni servidor propio — cualquier servidor estático sirve (`npx http-server`, la extensión Live Server de VS Code, etc.). |

No hay `package.json` en la raíz del repositorio ni en `frontend/` — únicamente `backend/` tiene dependencias de Node.

## 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd itdesk
```

## 2. Base de datos

Crear la base de datos y cargar el esquema:

```bash
mysql -u root -p -e "CREATE DATABASE itdesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p itdesk < "base de datos/schema.sql"
```

El esquema define las 15 tablas (ver [05-base-de-datos.md](05-base-de-datos.md)) pero **no incluye datos semilla** — la base queda vacía. Para poder iniciar sesión hace falta al menos un usuario con `rol = 'Administrador'`; la forma más simple es insertarlo a mano con una contraseña ya hasheada con bcrypt (10 rondas, igual que hace `usuario.service.js`), por ejemplo generándola con:

```bash
node -e "console.log(require('bcrypt').hashSync('TuClaveSegura123!', 10))"
```

(ejecutar ese comando dentro de `backend/`, donde `bcrypt` ya está instalado tras el paso 3) y luego:

```sql
INSERT INTO usuario (nombre, apellido, correo, contraseña, rol, tipo_documento, num_documento, estado)
VALUES ('Admin', 'ITDesk', 'admin@itdesk.local', '<hash-generado-arriba>', 'Administrador', 'Cedula', '000000000', 'Activo');
```

## 3. Backend

```bash
cd backend
npm install
```

Crear `backend/.env` (no está versionado — no existe un `.env.example` en el repositorio, así que hay que crearlo desde cero) con estas claves, todas leídas por `backend/src/config/database.js` y `backend/src/server.js`:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=itdesk

JWT_SECRET=<una-cadena-larga-y-secreta>
JWT_EXPIRES_IN=8h
```

Notas sobre estas variables:
- `JWT_SECRET` debe ser un valor propio y secreto en cualquier entorno que no sea desarrollo local — es la clave con la que se firman y verifican todos los tokens de sesión.
- `JWT_EXPIRES_IN` acepta cualquier formato soportado por `jsonwebtoken` (`"8h"`, `"1d"`, un número de segundos, etc.).
- `DB_PASSWORD` puede quedar vacío si MySQL local corre con el usuario `root` sin contraseña (típico en desarrollo).

Levantar el servidor:

```bash
npm run dev     # con nodemon, reinicia automáticamente al guardar cambios
# o
npm start       # node plano, sin recarga automática
```

Por defecto queda escuchando en `http://localhost:3000`. Verificar que levantó correctamente con cualquier endpoint que no dependa de la base de datos — por ejemplo:

```bash
curl http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d "{}"
# Debería responder 400 con un mensaje de "Correo y contraseña son requeridos"
```

> `GET /api/health`, el endpoint pensado para verificar la conexión a la base de datos, tiene un bug conocido y **siempre devuelve 500** sin importar el estado real de la conexión — no usarlo como diagnóstico. Ver el detalle en [14-problemas-conocidos.md](14-problemas-conocidos.md).

## 4. Frontend

El frontend consume la API en una URL **hardcodeada** (`frontend/js/api.js`, constante `API_URL = "http://localhost:3000/api"`) — no es configurable por variable de entorno. Esto significa que el backend debe correr en `localhost:3000` (o hay que editar esa constante a mano si se despliega distinto).

Servir la carpeta `frontend/` con cualquier servidor de archivos estáticos, por ejemplo:

```bash
cd frontend
npx http-server -p 8080
```

Abrir `http://localhost:8080/index.html` (landing pública, sin login) o directamente `http://localhost:8080/login.html`.

> Abrir los archivos `.html` directamente desde el disco (`file://`) **no funciona** para las páginas protegidas ni para `index.html`: el navegador bloquea las peticiones `fetch` en ese contexto. Siempre hace falta un servidor HTTP, aunque sea el más simple.

## 5. Ejecutar los tests del backend

```bash
cd backend
npm test
```

Los tests (`backend/tests/services/`) usan Jest con el pool de MySQL mockeado (`backend/src/config/__mocks__/database.js`) — no necesitan una base de datos real corriendo ni datos cargados.

## Resumen de puertos

| Servicio | Puerto por defecto | Configurable |
|---|---|---|
| Backend (API) | `3000` | Sí, vía `PORT` en `.env` — pero el frontend asume `3000` en su URL hardcodeada |
| Frontend (estático) | El que use el servidor elegido (ejemplo: `8080`) | Sí, libremente |
| MySQL | `3306` | Sí, vía `DB_PORT` en `.env` |
