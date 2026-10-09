# ITDesk

Sistema web de gestión de incidencias y soporte técnico.

- `backend/`: API en Node.js + Express, en `http://localhost:3000`.
- `frontend/`: aplicación React + Vite, en `http://localhost:5173`.
- `base de datos/`: esquema de MySQL y datos de prueba.

## Requisitos

- Node.js 22 o superior (Vite pide `^20.19` o `>=22.12`).
- MySQL 8 o MariaDB 10.4 o superior (sirve el de XAMPP).
- Git.

## Instalación local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/Felixnosoy/ITDesk.git
cd ITDesk
cd backend && npm install
cd ../frontend && npm install
```

### 2. Crear la base de datos

En MySQL Workbench, phpMyAdmin o la consola:

```sql
CREATE DATABASE itdesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Con la base `itdesk` seleccionada, corre en este orden:

1. `base de datos/schema.sql` crea las tablas.
2. `base de datos/datos-prueba.sql` crea una cuenta por rol para poder iniciar sesión.

Desde la consola:

```bash
mysql -u root -p itdesk < "base de datos/schema.sql"
mysql -u root -p itdesk < "base de datos/datos-prueba.sql"
```

`schema.sql` borra y recrea las tablas, así que sirve también para dejar la base limpia.

### 3. Variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En `backend/.env` completa:

- `DB_PASSWORD`: la contraseña de tu MySQL. Con XAMPP suele quedar vacía.
- `JWT_SECRET`: cualquier texto largo y aleatorio.

Los archivos `.env` no se suben al repositorio. Cada integrante tiene el suyo.

### 4. Levantar el proyecto

En dos terminales:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

Abre `http://localhost:5173`.

## Cuentas de prueba

Todas usan la contraseña `Prueba123!`.

| Rol | Correo |
| --- | --- |
| Administrador | administrador.prueba@itdesk.test |
| Recepcionista | recepcionista.prueba@itdesk.test |
| Técnico | tecnico.prueba@itdesk.test |
| Cliente | cliente.prueba@itdesk.test |

## Pruebas

```bash
cd backend && npm test
```

Las pruebas unitarias usan una base de datos simulada, así que no necesitan MySQL.

Las pruebas de integración prueban la API real contra MySQL:

```bash
cd backend && npm run test:integracion
```

Crean desde cero una base aparte, `itdesk_test`, con `schema.sql` y `datos-prueba.sql`. Para usar otro nombre se define `DB_NAME_TEST` en `backend/.env`. Ese nombre tiene que terminar en `_test`, así nunca tocan la base de trabajo. Las imágenes que suben van a una carpeta temporal.

La API de las pruebas de integración se conecta con un usuario de MySQL restringido (ver la sección siguiente). Por eso el `DB_USER` de tu `.env` tiene que poder crear usuarios; con `root` en local alcanza.

## Usuarios de la base de datos

La aplicación no se conecta a MySQL con `root`. Hay dos usuarios, cada uno con lo mínimo que necesita y solo sobre la base de ITDesk:

| Usuario | Quién lo usa | Qué puede hacer | Qué no puede hacer |
| --- | --- | --- | --- |
| `itdesk_app` | El backend (`DB_USER` en el servidor) | Leer, agregar y actualizar datos, tabla por tabla, solo lo que el backend usa | Borrar o cambiar tablas, borrar datos, editar el historial (auditoría, línea de tiempo, notas, adjuntos, líneas de cotizaciones y facturas), crear usuarios, ver otras bases |
| `itdesk_admin` | Una persona del equipo, a mano | Crear y cambiar tablas: correr `schema.sql`, `ALTER TABLE`, cargar datos | Crear usuarios, dar permisos, ver otras bases |

Para crearlos o actualizarlos:

1. En `backend/.env`, completa `DB_ROOT_USER` y `DB_ROOT_PASSWORD` (quien puede crear usuarios, solo en tu máquina), además de `DB_APP_PASSWORD` y `DB_ADMIN_PASSWORD`, de 12 caracteres o más.
2. Corre `schema.sql` en la base.
3. `cd backend && npm run db:usuarios`. Se puede repetir sin problema. Para ver el SQL sin aplicarlo: `npm run db:usuarios -- --ver` (las claves salen ocultas).
4. Para que el backend use el usuario restringido, pon en su `.env` `DB_USER=itdesk_app` y su clave en `DB_PASSWORD`. En producción el backend no arranca con `root`.

Qué puede hacer cada usuario sobre cada tabla está en `backend/scripts/privilegios.js`, explicado en [`docs/privilegios-base-de-datos.md`](docs/privilegios-base-de-datos.md). Si una función nueva empieza a usar una operación que no está ahí (por ejemplo un `DELETE`) o se agrega una tabla, hay que sumarla en ese archivo y volver a correr el script; si no, las pruebas de integración fallan.

## Cómo trabajamos en equipo

Cada integrante tiene su propia rama y nadie hace commits en `main`. GitHub no lo permite: todo cambio entra por Pull Request con la aprobación del otro integrante.

| Integrante | Rama |
| --- | --- |
| Felix | `felix` |
| Marco | `marco` |

### Antes de empezar una tarea

Trae a tu rama lo último que se haya aprobado en `main`:

```bash
git switch marco            # o felix
git pull                    # lo último de tu propia rama
git pull origin main        # lo último aprobado en main
```

### Al terminar una tarea

```bash
cd backend && npm test      # tiene que pasar
git push
gh pr create --base main    # o desde la web de GitHub
```

El otro integrante revisa el Pull Request y lo aprueba. Después se hace el merge (solo está habilitado el merge commit). Si subes más commits después de la aprobación, hay que aprobarlo de nuevo.

Cuando se haga el merge, los dos corren `git pull origin main` en su rama para quedar al día.

### Reglas

- Commits en español, con el formato `tipo(modulo): descripcion`. Por ejemplo: `feat(tickets): ...`, `fix(auth): ...`, `test(usuarios): ...`.
- **Cambios en la base de datos:** todo cambio de tablas se agrega a `base de datos/schema.sql` en el mismo Pull Request, y se avisa al otro integrante para que actualice su base local. Cada uno tiene su propia base, así que un cambio no avisado rompe el backend del otro.
- Las tareas se toman del tablero del proyecto en GitHub. Asígnate el issue antes de empezar para no trabajar los dos en lo mismo.
- Pull Requests cortos, una historia o subtarea a la vez. Un PR grande es difícil de revisar y es más fácil que choque con el trabajo del otro.
