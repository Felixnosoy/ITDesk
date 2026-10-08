# Privilegios de la base de datos

La aplicación no se conecta a MySQL con `root`. Hay dos usuarios con fines distintos, y cada uno tiene solo los permisos que necesita y únicamente sobre la base de ITDesk. Ninguno tiene permisos globales ni puede dar permisos a otros.

| Usuario | Lo usa | Para qué |
| --- | --- | --- |
| `itdesk_app` | El backend (`DB_USER` en el servidor) | Leer y escribir los datos del sistema |
| `itdesk_admin` | Una persona del equipo, a mano | Crear y cambiar tablas: `schema.sql`, `ALTER TABLE`, datos iniciales |

La matriz de permisos vive en `backend/scripts/privilegios.js`, que es la fuente de verdad. Este documento la explica.

## Usuario de la aplicación

Se revisaron todas las consultas de `backend/src` para saber qué operación hace el backend sobre cada tabla. El usuario recibe exactamente eso, tabla por tabla:

| Tabla | SELECT | INSERT | UPDATE | DELETE |
| --- | :-: | :-: | :-: | :-: |
| usuario | ✓ | ✓ | ✓ | |
| ticket | ✓ | ✓ | ✓ | |
| diagnostico | ✓ | ✓ | ✓ | |
| cotizacion | ✓ | ✓ | ✓ | |
| factura | ✓ | ✓ | ✓ | |
| equipo | ✓ | ✓ | | |
| asignacion | ✓ | ✓ | | |
| actualizacion | ✓ | ✓ | | |
| nota_privada | ✓ | ✓ | | |
| archivo_adjunto | ✓ | ✓ | | |
| cotizacion_linea | ✓ | ✓ | | |
| factura_linea | ✓ | ✓ | | |
| auditoria | ✓ | ✓ | | |

Qué se gana:

- **Sin `DROP`, `ALTER` ni `CREATE`.** Aunque alguien lograra ejecutar SQL a través de la aplicación, no puede borrar ni cambiar tablas.
- **Sin `DELETE` en ninguna tabla.** El sistema no borra nada: los usuarios se desactivan y los tickets cambian de estado.
- **El historial es de solo agregar.** La auditoría, la línea de tiempo, las notas, los adjuntos y las líneas de cotizaciones y facturas no se pueden editar ni borrar, ni siquiera desde la aplicación.

Los `SELECT ... FOR UPDATE` que usa el backend para evitar dobles clics funcionan porque esas tablas (`ticket`, `cotizacion` y `factura`) tienen `UPDATE`.

## Usuario de administración

Tiene `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `ALTER`, `INDEX`, `REFERENCES`, `CREATE VIEW`, `SHOW VIEW`, `TRIGGER`, `LOCK TABLES` y `CREATE TEMPORARY TABLES`, solo sobre la base de ITDesk. No tiene `GRANT OPTION` ni privilegios globales: no puede crear usuarios ni ver otras bases.

Sus credenciales no van en el servidor. Las usa una persona cuando hay que correr `schema.sql` o un `ALTER TABLE`.

## Cuando cambia el backend

Si una función nueva empieza a usar una operación que no está en la tabla, por ejemplo un `DELETE`, o si se agrega una tabla, hay que sumarla en `backend/scripts/privilegios.js` y volver a correr el script. El script se niega a correr si la base tiene una tabla que la matriz no menciona, para que no se olvide.
