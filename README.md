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

Las pruebas usan una base de datos simulada, así que no necesitan MySQL.

## Cómo trabajamos en equipo

- Nadie hace commits directos a `main`. Cada historia o subtarea va en su propia rama:

  ```bash
  git switch main && git pull
  git switch -c feat/hu07-nombre-corto
  ```

- Al terminar, se sube la rama y se abre un Pull Request hacia `main`. El otro integrante lo revisa antes del merge.
- `npm test` tiene que pasar antes de abrir el Pull Request.
- Si `main` avanzó mientras trabajabas, trae esos cambios a tu rama con `git merge main` antes del Pull Request.
- Commits en español, uno por tarea, con el formato `tipo(modulo): descripcion`. Por ejemplo: `feat(tickets): ...`, `fix(auth): ...`, `test(usuarios): ...`.
- **Cambios en la base de datos:** todo cambio de tablas se agrega a `base de datos/schema.sql` en el mismo Pull Request, y se avisa al otro integrante para que actualice su base local. Cada uno tiene su propia base, así que un cambio no avisado rompe el backend del otro.
- Las tareas se toman del tablero del proyecto en GitHub. Asígnate el issue antes de empezar para no trabajar los dos en lo mismo.
