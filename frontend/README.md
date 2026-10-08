# ITDesk — Frontend

Aplicación web (React + Vite) para el sistema de gestión de soporte técnico ITDesk.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar VITE_API_URL si el backend no corre en localhost:3000
npm run dev
```

Requiere el backend (`../backend`) corriendo aparte.

## Build de producción

La URL del backend queda fija dentro del build, así que `VITE_API_URL` tiene que estar definida **antes** de ejecutar `npm run build`:

- **En el hosting** (Render u otro): agregar la variable de entorno `VITE_API_URL` con la URL pública del backend terminada en `/api`, por ejemplo `https://mi-backend.onrender.com/api`. Esa variable tiene prioridad sobre cualquier `.env`.
- **En una máquina local**: crear `frontend/.env.production.local` con la misma variable. Ese archivo no se sube al repositorio.

```bash
npm run build     # genera dist/
npm run preview   # sirve dist/ en http://localhost:4173 para revisarlo
```

Si la variable falta o no empieza con `http://` o `https://`, el build se detiene con un mensaje en lugar de generar una aplicación que no puede conectarse. El backend tiene que permitir por CORS el dominio donde se publique el frontend.

## Impresión

Al imprimir cualquier pantalla (Ctrl+P) se ocultan el menú lateral, los botones de acción, los formularios y los avisos. Dos clases sirven para ajustar una pantalla:

- `no-imprimir`: el elemento se ve en pantalla pero no en papel.
- `solo-imprimir`: el elemento aparece solo en papel.

En el detalle del ticket, el botón "Imprimir" de la cotización y de la factura saca en papel solo ese documento (cliente, equipo, líneas y total): mientras se imprime, la página queda en `no-imprimir` y el documento (`components/DocumentoImprimible.jsx`) en `solo-imprimir`.
