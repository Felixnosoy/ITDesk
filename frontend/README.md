# ITDesk — Frontend

Aplicación web (React + Vite) para el sistema de gestión de soporte técnico ITDesk.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar VITE_API_URL si el backend no corre en localhost:3000
npm run dev
```

Requiere el backend (`../backend`) corriendo aparte.

## Impresión

Al imprimir cualquier pantalla (Ctrl+P) se ocultan el menú lateral, los botones de acción, los formularios y los avisos. Dos clases sirven para ajustar una pantalla:

- `no-imprimir`: el elemento se ve en pantalla pero no en papel.
- `solo-imprimir`: el elemento aparece solo en papel.
