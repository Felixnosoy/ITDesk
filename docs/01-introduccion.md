# 1. Introducción al proyecto

## Qué es ITDesk

ITDesk es un sistema de gestión de soporte técnico (ITSM — *IT Service Management*) para un taller/servicio técnico que atiende equipos de cómputo (PCs, impresoras, y similares) a nombre de sus clientes. Cubre el ciclo completo de un caso de soporte: desde que un cliente reporta un problema en persona, pasando por diagnóstico, cotización, aprobación, facturación y cierre, hasta la calificación de satisfacción del cliente.

No es un producto genérico de mesa de ayuda ni un helpdesk de autoservicio: el modelo de negocio asume que el cliente **nunca crea ni modifica tickets por sí mismo** — siempre llega o llama, y el personal (Recepcionista, Técnico o Administrador) registra el caso en el sistema. El cliente sí puede iniciar sesión para consultar el estado de sus propios tickets, ver y aprobar/rechazar cotizaciones, descargar sus facturas y cotizaciones, y calificar el servicio una vez cerrado el ticket.

## Objetivo y problema que resuelve

Antes de un sistema como este, un taller técnico típicamente lleva el seguimiento de sus casos en papel, planillas sueltas o cuadernos de recepción — sin trazabilidad clara de quién hizo qué, sin historial consultable por el cliente, y sin un flujo que impida, por ejemplo, cerrar un ticket sin cobrarlo o sin que el cliente haya aprobado el costo. ITDesk centraliza ese flujo en un sistema web con:

- Un registro único de clientes, equipos y tickets, consultable por todo el personal.
- Reglas de negocio aplicadas en el backend (no solo sugeridas por la interfaz) — por ejemplo, no se puede marcar un ticket como "Resuelto" sin una cotización aprobada y facturada, salvo que se declare explícitamente que el trabajo no tuvo costo.
- Visibilidad diferenciada: el cliente ve su propio historial y puede aprobar cotizaciones; el personal ve diagnóstico, notas internas y el detalle operativo completo.
- Trazabilidad: un log de auditoría automático registra los eventos relevantes del sistema (creación de tickets, cambios de estado, aprobaciones, reseteos de contraseña, etc.).
- Reportes y estadísticas para que el Administrador tenga visibilidad del negocio (tickets por estado, rendimiento por técnico, facturación, satisfacción).

## Público objetivo

Un equipo pequeño/mediano de soporte técnico con cuatro tipos de usuario:

- **Cliente**: dueño de los equipos que se llevan a reparar. Consulta el estado de sus tickets, aprueba/rechaza cotizaciones, descarga documentos y califica el servicio.
- **Recepcionista**: recibe al cliente en persona, registra clientes nuevos, equipos y tickets. No participa en el trabajo técnico del ticket.
- **Técnico**: diagnostica, cotiza, factura y resuelve tickets. Ve la cola completa de trabajo (no solo "sus" tickets asignados — la asignación es orientativa, ver [08-roles.md](08-roles.md)).
- **Administrador**: superset de los permisos de Técnico, más gestión de usuarios, reportes, auditoría y operaciones destructivas (eliminar registros).

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS y JavaScript "vanilla" (sin framework, sin build/bundler) |
| UI base | Bootstrap 5.3.7 + Bootstrap Icons 1.13.1 (vía CDN) |
| Gráficos | Chart.js 4 (vía CDN, usado solo en `reporte-estadisticas.html`) |
| Backend | Node.js + Express 5 |
| Base de datos | MySQL / MariaDB (driver `mysql2`, pool de conexiones con promesas) |
| Autenticación | JWT (`jsonwebtoken`) + contraseñas hasheadas con `bcrypt` |
| Subida de archivos | `multer` (almacenamiento en disco local) |
| Testing | Jest (backend, tests unitarios de servicios con la base de datos mockeada) |

Ver el detalle de cada dependencia y para qué se usa en [13-dependencias.md](13-dependencias.md).

## Arquitectura general

ITDesk sigue una arquitectura cliente-servidor clásica, sin SSR (*server-side rendering*) ni SPA con framework:

```
Frontend estático (HTML/CSS/JS)  <-- fetch (JSON) -->  API REST (Express)  <-->  MySQL
```

- El **frontend** es un conjunto de páginas HTML independientes (sin router del lado del cliente) que se sirven como archivos estáticos. Cada página carga sus propios scripts JS y comparte infraestructura común (autenticación, layout, helpers de UI) vía `<script>` planos, no módulos ES ni bundler.
- El **backend** expone una API REST bajo el prefijo `/api`, organizada en 18 recursos, cada uno siguiendo la separación **Rutas → Controlador → Servicio → Base de datos**.
- Toda la lógica de negocio (validaciones, gates de estado, cálculos de montos) vive en la capa de **servicio** del backend, nunca solo en el frontend — el frontend refleja esas reglas en la UI, pero el backend es la fuente de verdad.
- No hay tiempo real (websockets): las pantallas que necesitan datos "frescos" (notificaciones, KPIs del dashboard) hacen *polling* periódico.

El detalle completo del flujo de una petición está en [03-arquitectura.md](03-arquitectura.md).
