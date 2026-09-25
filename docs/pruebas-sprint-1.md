# Pruebas del Sprint 1

Resultado: **143 casos de aceptación aprobados** en navegador y API reales, y **28 pruebas automáticas del backend** en verde. Ejecución del 25 de septiembre de 2026.

## Alcance

Historias HU01 a HU06 del Sprint 1: inicio de sesión, protección de pantallas por rol, panel de inicio, perfil, cambio de contraseña y gestión de usuarios. Cada historia se prueba en la columna test del tablero antes de pasar a Done.

## Entorno

- Backend Node/Express con MySQL local, en `http://localhost:3000`.
- Frontend React con Vite, en `http://localhost:5173`.
- Navegador Chromium automatizado, en escritorio (1280 px) y en móvil (400 px de ancho).
- Una cuenta de prueba por rol; las cuentas descartables que crean las pruebas se eliminan al terminar.

| Rol | Cuenta de prueba |
| --- | --- |
| Administrador | administrador.prueba@itdesk.test |
| Recepcionista | recepcionista.prueba@itdesk.test |
| Técnico | tecnico.prueba@itdesk.test |
| Cliente | cliente.prueba@itdesk.test |

## Pruebas automáticas del backend

Se ejecutan con `npm test` dentro de `backend/`. Los servicios trabajan contra una base de datos simulada, así que no dependen de MySQL.

| Suite | Pruebas | Cubre |
| --- | --- | --- |
| auth.service | 5 | Login: datos faltantes, correo inexistente, usuario inactivo, contraseña incorrecta y login correcto sin exponer el hash |
| usuario.service | 15 | Alta con correo o documento duplicado y contraseña cifrada, cambio y restablecimiento de contraseña, cambio de estado y perfil propio |
| auth.middleware | 5 | Token ausente, con formato inválido, alterado, vencido y válido |
| rol.middleware | 3 | Rol permitido, rol rechazado y comparación exacta del rol |

## Casos de aceptación

### HU02 — Proteger cada pantalla según el rol

| Caso | Resultado |
| --- | --- |
| Sin sesión, /usuarios redirige al login | Aprobado |
| Sin sesión, /perfil redirige al login | Aprobado |
| Sin sesión, /cambiar-contrasena redirige al login | Aprobado |
| Sin sesión, /administrador redirige al login | Aprobado |
| Sin sesión, / redirige al login | Aprobado |
| Administrador no puede abrir el panel de Recepcionista (/recepcion) | Aprobado |
| Administrador no puede abrir el panel de Tecnico (/tecnico) | Aprobado |
| Administrador no puede abrir el panel de Cliente (/cliente) | Aprobado |
| Administrador: una dirección inexistente lo devuelve a su panel | Aprobado |
| Administrador sí abre las pantallas comunes (/perfil) | Aprobado |
| Recepcionista no puede abrir el panel de Administrador (/administrador) | Aprobado |
| Recepcionista no puede abrir el panel de Tecnico (/tecnico) | Aprobado |
| Recepcionista no puede abrir el panel de Cliente (/cliente) | Aprobado |
| Recepcionista: una dirección inexistente lo devuelve a su panel | Aprobado |
| Recepcionista sí abre las pantallas comunes (/perfil) | Aprobado |
| Tecnico no puede abrir el panel de Administrador (/administrador) | Aprobado |
| Tecnico no puede abrir el panel de Recepcionista (/recepcion) | Aprobado |
| Tecnico no puede abrir el panel de Cliente (/cliente) | Aprobado |
| Tecnico: una dirección inexistente lo devuelve a su panel | Aprobado |
| Tecnico sí abre las pantallas comunes (/perfil) | Aprobado |
| Cliente no puede abrir el panel de Administrador (/administrador) | Aprobado |
| Cliente no puede abrir el panel de Recepcionista (/recepcion) | Aprobado |
| Cliente no puede abrir el panel de Tecnico (/tecnico) | Aprobado |
| Cliente: una dirección inexistente lo devuelve a su panel | Aprobado |
| Cliente sí abre las pantallas comunes (/perfil) | Aprobado |
| Cerrar sesión lleva al login | Aprobado |
| Tras cerrar sesión, /perfil vuelve a pedir login | Aprobado |
| Con un token inválido la sesión se cierra y vuelve al login | Aprobado |
| La sesión inválida se borra del navegador | Aprobado |
| API: sin token responde 401 | Aprobado |
| API: con token alterado responde 401 | Aprobado |
| API: con un rol no permitido responde 403 | Aprobado |
| API: un recurso inexistente responde 404 con el formato estándar | Aprobado |

### HU03 — Panel de inicio según mi rol

| Caso | Resultado |
| --- | --- |
| Administrador: tras el login aterriza en su panel (/administrador) | Aprobado |
| Administrador: el menú muestra solo sus secciones | Aprobado |
| Administrador: el panel muestra su título, rol y correo | Aprobado |
| Administrador: el menú marca "Inicio" como sección activa | Aprobado |
| Administrador: el menú muestra el nombre y el rol de quien inició sesión | Aprobado |
| Administrador: el acceso rápido lleva a Usuarios | Aprobado |
| Recepcionista: tras el login aterriza en su panel (/recepcion) | Aprobado |
| Recepcionista: el menú muestra solo sus secciones | Aprobado |
| Recepcionista: el panel muestra su título, rol y correo | Aprobado |
| Recepcionista: el menú marca "Inicio" como sección activa | Aprobado |
| Recepcionista: el menú muestra el nombre y el rol de quien inició sesión | Aprobado |
| Tecnico: tras el login aterriza en su panel (/tecnico) | Aprobado |
| Tecnico: el menú muestra solo sus secciones | Aprobado |
| Tecnico: el panel muestra su título, rol y correo | Aprobado |
| Tecnico: el menú marca "Inicio" como sección activa | Aprobado |
| Tecnico: el menú muestra el nombre y el rol de quien inició sesión | Aprobado |
| Cliente: tras el login aterriza en su panel (/cliente) | Aprobado |
| Cliente: el menú muestra solo sus secciones | Aprobado |
| Cliente: el panel muestra su título, rol y correo | Aprobado |
| Cliente: el menú marca "Inicio" como sección activa | Aprobado |
| Cliente: el menú muestra el nombre y el rol de quien inició sesión | Aprobado |
| Administrador: en 400 px no hay desplazamiento horizontal | Aprobado |
| Administrador: en móvil el menú lateral empieza oculto | Aprobado |
| Administrador: la hamburguesa abre el menú | Aprobado |
| Administrador: Escape cierra el menú | Aprobado |
| Administrador: al elegir una sección el menú se cierra solo | Aprobado |
| Recepcionista: en 400 px no hay desplazamiento horizontal | Aprobado |
| Recepcionista: en móvil el menú lateral empieza oculto | Aprobado |
| Recepcionista: la hamburguesa abre el menú | Aprobado |
| Recepcionista: Escape cierra el menú | Aprobado |
| Recepcionista: al elegir una sección el menú se cierra solo | Aprobado |
| Tecnico: en 400 px no hay desplazamiento horizontal | Aprobado |
| Tecnico: en móvil el menú lateral empieza oculto | Aprobado |
| Tecnico: la hamburguesa abre el menú | Aprobado |
| Tecnico: Escape cierra el menú | Aprobado |
| Tecnico: al elegir una sección el menú se cierra solo | Aprobado |
| Cliente: en 400 px no hay desplazamiento horizontal | Aprobado |
| Cliente: en móvil el menú lateral empieza oculto | Aprobado |
| Cliente: la hamburguesa abre el menú | Aprobado |
| Cliente: Escape cierra el menú | Aprobado |
| Cliente: al elegir una sección el menú se cierra solo | Aprobado |

### HU04 — Ver y editar mi perfil

| Caso | Resultado |
| --- | --- |
| Administrador: el perfil muestra correo y rol | Aprobado |
| Administrador: sin errores de consola en el perfil | Aprobado |
| Recepcionista: el perfil muestra correo y rol | Aprobado |
| Recepcionista: sin errores de consola en el perfil | Aprobado |
| Tecnico: el perfil muestra correo y rol | Aprobado |
| Tecnico: sin errores de consola en el perfil | Aprobado |
| Cliente: el perfil muestra correo y rol | Aprobado |
| Cliente: sin errores de consola en el perfil | Aprobado |
| Guardar está deshabilitado mientras no hay cambios | Aprobado |
| Guardar se habilita al modificar un campo | Aprobado |
| Se confirma el guardado con un aviso | Aprobado |
| El teléfono nuevo sigue ahí tras recargar | Aprobado |
| La dirección nueva sigue ahí tras recargar | Aprobado |
| PATCH del perfil responde 200 | Aprobado |
| El rol no cambia aunque se envíe en el cuerpo | Aprobado |
| El correo no cambia aunque se envíe en el cuerpo | Aprobado |
| El estado no cambia aunque se envíe en el cuerpo | Aprobado |
| No se puede editar el perfil de otro usuario (403) | Aprobado |
| Sin token el perfil responde 401 | Aprobado |

### HU05 — Cambiar mi contraseña

| Caso | Resultado |
| --- | --- |
| Administrador: el menú incluye Cambiar contraseña | Aprobado |
| Recepcionista: el menú incluye Cambiar contraseña | Aprobado |
| Tecnico: el menú incluye Cambiar contraseña | Aprobado |
| Cliente: el menú incluye Cambiar contraseña | Aprobado |
| Una contraseña de menos de 8 caracteres se rechaza con mensaje | Aprobado |
| Una confirmación distinta se rechaza con mensaje | Aprobado |
| Repetir la misma contraseña se rechaza con mensaje | Aprobado |
| Con la contraseña actual incorrecta el servidor rechaza y se muestra su mensaje | Aprobado |
| Con datos correctos se confirma el cambio | Aprobado |
| Los campos se limpian tras el cambio | Aprobado |
| La contraseña anterior ya no inicia sesión (401) | Aprobado |
| La contraseña nueva inicia sesión (200) | Aprobado |
| No se puede cambiar la contraseña de otro usuario (403) | Aprobado |
| Sin token responde 401 | Aprobado |

### HU06 — Gestionar usuarios del sistema

| Caso | Resultado |
| --- | --- |
| Recepcionista: no ve Usuarios en el menú | Aprobado |
| Recepcionista: al abrir /usuarios a mano lo mandan a no autorizado | Aprobado |
| Tecnico: no ve Usuarios en el menú | Aprobado |
| Tecnico: al abrir /usuarios a mano lo mandan a no autorizado | Aprobado |
| Cliente: no ve Usuarios en el menú | Aprobado |
| Cliente: al abrir /usuarios a mano lo mandan a no autorizado | Aprobado |
| Administrador: el menú incluye Usuarios | Aprobado |
| El listado carga los usuarios existentes | Aprobado |
| El filtro por rol muestra solo ese rol | Aprobado |
| La búsqueda por correo reduce el listado | Aprobado |
| Sin coincidencias se muestra un mensaje | Aprobado |
| Crear con contraseña corta se rechaza con mensaje | Aprobado |
| Se crea el usuario y se avisa | Aprobado |
| El nuevo usuario aparece en el listado como Técnico activo | Aprobado |
| El usuario existe en el servidor con su especialidad | Aprobado |
| Un correo repetido muestra el error del servidor | Aprobado |
| Escape cierra la ventana sin crear nada | Aprobado |
| La edición se guarda en el servidor | Aprobado |
| La edición conserva el rol y el correo | Aprobado |
| Desactivar pide confirmación antes de actuar | Aprobado |
| El usuario queda Inactivo en el listado | Aprobado |
| Un usuario desactivado ya no puede iniciar sesión (403) | Aprobado |
| Al activarlo vuelve a poder iniciar sesión (200) | Aprobado |
| Una confirmación distinta se rechaza | Aprobado |
| Tras restablecer, la contraseña anterior falla (401) | Aprobado |
| Tras restablecer, la nueva funciona (200) | Aprobado |
| No se puede desactivar la propia cuenta | Aprobado |
| No se puede cambiar el propio rol | Aprobado |
| En móvil la página no se desborda horizontalmente | Aprobado |
| En móvil la ventana de alta cabe en la pantalla | Aprobado |
| Un técnico no puede cambiar estados (403) | Aprobado |
| Un cliente no puede restablecer contraseñas (403) | Aprobado |
| Recepción no puede editar usuarios (403) | Aprobado |
| Un cliente no puede listar usuarios (403) | Aprobado |
| Recepción solo puede dar de alta clientes (el rol se fuerza a Cliente) | Aprobado |
| No existe un endpoint para borrar usuarios (404) | Aprobado |

HU01 (iniciar sesión) se cubre con las pruebas automáticas de auth.service y con el flujo de login que usan todos los casos anteriores.

## Defectos encontrados y corregidos

- En la pantalla de Usuarios, el aviso de la acción anterior seguía visible al abrir otra ventana y podía confundirse con el resultado de la nueva acción. Ahora se limpia al abrir cada ventana.
