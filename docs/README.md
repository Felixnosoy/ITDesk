# Documentación de ITDesk

Documentación técnica completa del proyecto: sistema de gestión de soporte técnico (ITSM) con frontend HTML/CSS/JS estático y backend Node.js/Express + MySQL. Pensada para que cualquier persona del equipo, incluso sin haber participado desde el inicio, pueda entender cómo funciona el sistema e incorporarse a su desarrollo sin depender de explicaciones adicionales.

Toda esta documentación está basada en el código fuente real del proyecto al momento de escribirla (agosto de 2026) — no describe funcionalidades planeadas ni supuestas. Donde el código está incompleto, tiene un bug conocido o es inconsistente, se señala explícitamente en vez de asumirse correcto (ver especialmente el capítulo 14).

## Índice

1. [Introducción al proyecto](01-introduccion.md) — qué es ITDesk, a quién sirve, con qué tecnologías está construido.
2. [Estructura del proyecto](02-estructura-proyecto.md) — carpetas y responsabilidad de cada una.
3. [Arquitectura del sistema](03-arquitectura.md) — cómo viaja una petición del frontend al backend y de vuelta, con diagrama.
4. [Instalación](04-instalacion.md) — requisitos, base de datos, variables de entorno, cómo levantar todo localmente.
5. [Base de datos](05-base-de-datos.md) — las 15 tablas, sus columnas y relaciones, con diagrama entidad-relación.
6. [API](06-api.md) — convenciones de la API REST y el índice de los 18 recursos (ver también [`docs/api/`](api/) para el detalle de los 99 endpoints).
7. [Sistema de autenticación](07-autenticacion.md) — login, JWT, middleware, protección de rutas.
8. [Roles del sistema](08-roles.md) — qué puede hacer cada uno de los 4 roles (Cliente, Técnico, Administrador, Recepcionista).
9. [Flujo del sistema](09-flujo-sistema.md) — el recorrido típico de un ticket, con diagramas de estado.
10. [Componentes importantes del frontend](10-frontend.md) — las 23 pantallas, la infraestructura compartida, el sistema de diseño.
11. [Guía para desarrolladores](11-guia-desarrolladores.md) — cómo agregar un endpoint, un recurso, una tabla o una pantalla nueva.
12. [Convenciones del proyecto](12-convenciones.md) — nomenclatura, manejo de errores, estilo de código.
13. [Dependencias](13-dependencias.md) — para qué sirve cada paquete usado en el proyecto.
14. [Problemas conocidos](14-problemas-conocidos.md) — bugs reales, inconsistencias y deuda técnica, verificados contra el código.
15. [Futuras mejoras](15-futuras-mejoras.md) — lista priorizada de próximos pasos razonables.
16. [Glosario](16-glosario.md) — términos de negocio del dominio.

## Por dónde empezar

- **¿Vas a levantar el proyecto por primera vez?** Empieza por el capítulo [4](04-instalacion.md).
- **¿Vas a tocar un endpoint existente o crear uno nuevo?** Lee [3](03-arquitectura.md), [6](06-api.md) y [11](11-guia-desarrolladores.md), en ese orden.
- **¿Vas a trabajar en una pantalla del frontend?** Lee [10](10-frontend.md) y la matriz de roles en [8](08-roles.md).
- **¿Necesitás entender una regla de negocio puntual** (por qué no se puede cerrar un ticket, por qué una cotización quedó bloqueada, etc.)? Está en [9](09-flujo-sistema.md) y repetida en el archivo de `docs/api/` del recurso correspondiente.
- **¿Algo se comporta raro y no sabés si es un bug?** Revisá primero [14](14-problemas-conocidos.md) — es posible que ya esté identificado.
