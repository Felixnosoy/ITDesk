# API de tickets

Endpoints del Sprint 2 para las pantallas de tickets. Todas las rutas empiezan con `/api`, piden el token (`Authorization: Bearer <token>`) y responden con el formato de siempre:

```json
{ "success": true, "message": "...", "data": { } }
```

Si hay un error, `success` es `false` y `message` explica el motivo en una frase lista para mostrar al usuario.

| Código | Significa |
| --- | --- |
| 400 | Datos inválidos o regla de negocio incumplida. El mensaje dice cuál. |
| 401 | Falta el token o venció. `apiFetch` ya cierra la sesión. |
| 403 | El rol no puede hacer esa acción. |
| 404 | No existe, o es un ticket o archivo ajeno para un Cliente. |
| 409 | Duplicado, por ejemplo un número de serie ya registrado. |

## Resumen

| Método | Ruta | Roles | Para |
| --- | --- | --- | --- |
| GET | `/tickets` | Todos | HU09 listado |
| GET | `/tickets/:id` | Todos | HU10 detalle |
| POST | `/tickets` | Administrador, Recepcionista, Técnico | HU08 registro |
| PUT | `/tickets/:id/diagnostico` | Administrador, Técnico | HU12 diagnóstico |
| POST | `/tickets/:id/actualizaciones` | Administrador, Técnico | HU11 avance público |
| POST | `/tickets/:id/notas` | Administrador, Técnico | HU11 nota privada |
| PATCH | `/tickets/:id/estado` | Administrador, Técnico | HU13 cambio de estado |
| GET | `/archivos/:id` | Todos | HU11 ver imagen |
| GET | `/usuarios/clientes?busqueda=` | Administrador, Recepcionista | HU08 buscar cliente |
| POST | `/usuarios` | Administrador, Recepcionista | HU08 alta de cliente |
| GET | `/equipos?id_cliente=` | Administrador, Recepcionista, Técnico | HU08 equipos del cliente |
| POST | `/equipos` | Administrador, Recepcionista | HU08 alta de equipo |

## Catálogos

Los valores se guardan sin tildes y son los mismos de `frontend/src/constants/tickets.js`:

- **Estado:** `Abierto`, `En diagnostico`, `Esperando aprobacion`, `En reparacion`, `Resuelto`, `Cerrado`
- **Prioridad:** `Baja`, `Media`, `Alta`
- **Categoría:** `Hardware`, `Software`, `Red`, `Otro`

## El ticket

El listado, el detalle y la creación devuelven cada ticket con estos campos:

```json
{
  "id_ticket": 8,
  "titulo": "Pantalla azul al iniciar",
  "descripcion": "Error de sistema al arrancar Windows.",
  "estado": "En diagnostico",
  "prioridad": "Alta",
  "categoria": "Software",
  "fecha_apertura": "2026-09-27T14:02:11.000Z",
  "fecha_resolucion": null,
  "fecha_cierre": null,
  "resuelto_sin_costo": 0,
  "id_usuario": 5,
  "cliente": "Maria Gomez",
  "id_equipo": 4,
  "equipo_tipo": "Desktop",
  "equipo_marca": "Lenovo",
  "equipo_modelo": "ThinkCentre M70",
  "equipo_numero_serie": "LNM70-0004",
  "id_tecnico": 3,
  "tecnico": "Tecnico Prueba"
}
```

`id_usuario` es el cliente dueño. `id_tecnico` y `tecnico` salen de la asignación activa.

## HU09: listado

`GET /tickets?estado=&prioridad=&categoria=`

- El Cliente recibe solo sus tickets. El resto del personal recibe todos.
- Los tres filtros son opcionales y se combinan. Un filtro vacío no filtra. Un valor fuera del catálogo responde 400.
- Viene ordenado del más reciente al más viejo.
- `data` es un arreglo de tickets.

La búsqueda por texto y el orden por columnas se hacen en el navegador con `utils/tabla.js`.

## HU10: detalle

`GET /tickets/:id`

```json
{
  "ticket": { },
  "diagnostico": { "id_diagnostico": 1, "tecnico": "Tecnico Prueba", "diagnostico": "...", "solucion": "...", "observaciones": null, "fecha_diagnostico": "...", "fecha_edicion": null },
  "cotizable": true,
  "actualizaciones": [
    { "id_actualizacion": 3, "usuario": "Tecnico Prueba", "tipo": "Estado", "estado": "En diagnostico", "observaciones": null, "fecha": "...", "adjuntos": [] },
    { "id_actualizacion": 9, "usuario": "Tecnico Prueba", "tipo": "Avance", "estado": "En diagnostico", "observaciones": "Se clonó el disco.", "fecha": "...",
      "adjuntos": [ { "id_archivo": 4, "nombre_original": "disco.png", "tipo_mime": "image/png", "tamano_bytes": 20480, "fecha_subida": "...", "url": "/api/archivos/4" } ] }
  ],
  "notas_privadas": [
    { "id_nota": 1, "usuario": "Tecnico Prueba", "contenido": "...", "fecha": "...", "adjuntos": [] }
  ],
  "estados_siguientes": ["Esperando aprobacion", "En reparacion", "Resuelto"]
}
```

- `diagnostico` es `null` si todavía no hay. En ese caso `cotizable` es `false`.
- `actualizaciones` es la **línea de tiempo** (HU10.5), ya ordenada de la más vieja a la más nueva. `tipo` es `Avance` (lo escribió el técnico) o `Estado` (cambio de estado; `estado` es el estado al que pasó). `estado` en un avance es el estado que tenía el ticket en ese momento.
- **Cliente (HU10.4):** solo puede abrir sus tickets; uno ajeno responde 404. Su respuesta **no trae** `notas_privadas` ni `estados_siguientes`. La vista del cliente se decide por la ausencia de esas claves, sin comparar el rol.

## HU08: registro desde Recepción

Pasos del flujo, con su endpoint:

1. **Buscar cliente:** `GET /usuarios/clientes?busqueda=gomez`. Pide mínimo 2 caracteres. Devuelve hasta 20 clientes activos con `id_usuario, nombre, apellido, correo, tipo_documento, num_documento, telefono`.
2. **Alta rápida si no existe:** `POST /usuarios` con `nombre, apellido, correo, contraseña, tipo_documento, num_documento, telefono?, direccion?`. Si lo hace la Recepcionista, el rol queda en Cliente aunque se mande otro. Responde el usuario creado.
3. **Equipos del cliente:** `GET /equipos?id_cliente=5`. Devuelve un arreglo con `id_equipo, tipo, marca, modelo, numero_serie, estado, observaciones, fecha_registro`.
4. **Alta de equipo:** `POST /equipos` con `id_cliente, tipo, marca, modelo, numero_serie, observaciones?`. Responde 201 con el equipo. Un número de serie repetido responde 409.
5. **Técnicos para asignar:** `GET /usuarios` (solo Recepcionista y Administrador) y filtrar en el navegador por `rol === "Tecnico"` y `estado === "Activo"`.
6. **Crear el ticket:** `POST /tickets` con:

   ```json
   { "id_cliente": 5, "id_equipo": 4, "id_tecnico": 3, "titulo": "...", "descripcion": "...", "prioridad": "Media", "categoria": "Hardware" }
   ```

   Responde 201 con el ticket en estado `Abierto` y ya asignado. Sin técnico, con un técnico inactivo o con un equipo de otro cliente responde 400.

El código visible del ticket (HU08 y HU07.5) se arma en el frontend a partir de `id_ticket`.

## HU12: diagnóstico

`PUT /tickets/:id/diagnostico` con `{ "diagnostico": "...", "solucion": "...", "observaciones": "..." }`. Solo `diagnostico` es obligatorio.

- La primera vez responde **201**; si el ticket ya tenía diagnóstico lo reemplaza y responde **200**. Siempre hay uno solo.
- Queda a nombre de quien lo guarda.
- Un ticket `Cerrado` responde 400.

## HU11: avances, notas e imágenes

- **Avance público:** `POST /tickets/:id/actualizaciones` con el campo `observaciones`.
- **Nota privada:** `POST /tickets/:id/notas` con el campo `contenido`.

Los dos aceptan JSON, o `multipart/form-data` con **hasta 5 imágenes** (PNG, JPG, GIF o WEBP) de **hasta 5 MB** cada una, en el campo **`imagenes`**. El backend revisa el contenido real del archivo, no solo la extensión. Responden 201 con el avance o la nota y su arreglo `adjuntos`. Un ticket `Cerrado` responde 400.

### Dos cambios que hacen falta en el frontend

**1. Enviar `FormData`.** `apiFetch` siempre pone `Content-Type: application/json` y hace `JSON.stringify`. Con un `FormData` hay que dejar que el navegador arme el encabezado:

```js
const esFormData = body instanceof FormData;
const headers = esFormData ? {} : { "Content-Type": "application/json" };
// ...
body: esFormData ? body : body ? JSON.stringify(body) : undefined,
```

Y al armar el envío:

```js
const datos = new FormData();
datos.append("observaciones", texto);
archivos.forEach((archivo) => datos.append("imagenes", archivo));
```

Una captura pegada con Ctrl+V (HU11.4) llega en `evento.clipboardData.files` y se agrega igual.

**2. Mostrar imágenes.** `url` pide el token, así que `<img src={url}>` directo responde 401. Hay que pedir la imagen con `fetch` y el token, y mostrarla como blob:

```js
const r = await fetch(`${BASE_URL}${url.replace("/api", "")}`, { headers: { Authorization: `Bearer ${token}` } });
const src = URL.createObjectURL(await r.blob());
// al desmontar: URL.revokeObjectURL(src)
```

`VITE_API_URL` ya termina en `/api`, por eso se quita ese prefijo de `url`.

El Cliente solo puede descargar las imágenes de los avances de sus tickets. Las de las notas privadas le responden 404.

## HU13: cambio de estado

`PATCH /tickets/:id/estado` con `{ "estado": "En reparacion", "observaciones": "opcional", "sin_costo": false }`

| Desde | Puede pasar a |
| --- | --- |
| Abierto | En diagnostico |
| En diagnostico | Esperando aprobacion, En reparacion, Resuelto |
| Esperando aprobacion | En reparacion, En diagnostico |
| En reparacion | Resuelto |
| Resuelto | Cerrado, En reparacion |
| Cerrado | ninguno |

- **Para el selector (HU13.4),** usar `estados_siguientes` del detalle. No hay que repetir esta tabla en el frontend.
- **`Esperando aprobacion` exige diagnóstico.** Sin él responde 400.
- **Regla de cierre:** `Resuelto` exige una cotización aprobada y facturada. Esa parte llega en el Sprint 3, así que por ahora la única forma de resolver es mandar `"sin_costo": true`. Sin eso responde 400 con el motivo, que se puede mostrar tal cual. `sin_costo` tiene que ser booleano.
- **Respuesta:** 200 con el ticket actualizado. `fecha_resolucion` se llena al resolver y se vacía si el ticket vuelve a reparación; `fecha_cierre` se llena al cerrar.
- **Línea de tiempo:** cada cambio agrega una entrada de tipo `Estado`, que también ve el cliente.

## Datos de prueba

`base de datos/datos-prueba.sql` crea 2 clientes (`cliente.prueba@itdesk.test` y `maria.gomez@correo.test`) y 12 tickets, 2 en cada estado, todos asignados a `tecnico.prueba`. Algunos ya tienen diagnóstico, avances y notas privadas. La contraseña de todas las cuentas es `Prueba123!`.
