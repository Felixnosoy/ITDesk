← [Volver al índice de la API](../06-api.md)

# Archivos adjuntos — `/api/archivos`

Archivos subidos en el contexto de un ticket (fotos, PDFs), opcionalmente ligados a una entrada de `actualizacion` o de `nota_privada` puntual, con bandera público/privado. Usa `multer` con almacenamiento en disco (`backend/uploads/`, creada automáticamente si no existe). Todas las rutas exigen sesión.

**Configuración de subida**: solo se aceptan `image/jpeg`, `image/png`, `image/webp`, `image/gif` y `application/pdf`; límite de tamaño **5 MB**. El nombre físico del archivo en disco es generado (`timestamp-random.ext`), nunca el nombre original — el nombre original se guarda aparte en `nombre_original`.

## `POST /api/archivos`

- **Rol**: Administrador, Tecnico.
- **Content-Type**: `multipart/form-data`.

### Body esperado (form-data)

| Campo | Tipo | Notas |
|---|---|---|
| `archivo` | binario | el archivo en sí |
| `id_ticket` | texto | |
| `publico` | texto (`"true"`/`"false"`) | si será visible para el cliente |
| `id_actualizacion` | texto, opcional | liga el adjunto a una entrada del log público |
| `id_nota_privada` | texto, opcional | liga el adjunto a una nota interna |

`id_usuario` (quien sube) sale del JWT, no del body.

### Respuesta exitosa (200)

```json
{
  "message": "Archivo subido exitosamente",
  "data": {
    "id_archivo": 22,
    "id_ticket": 45,
    "id_usuario": 4,
    "usuario": "Ana Pérez",
    "nombre_original": "falla_fuente.jpg",
    "nombre_archivo": "1785600000000-483920175.jpg",
    "tipo_mime": "image/jpeg",
    "tamano_bytes": 245678,
    "publico": 1,
    "id_actualizacion": null,
    "id_nota_privada": null,
    "fecha_subida": "2026-08-01T10:40:00.000Z"
  }
}
```

### Errores

| Status | Mensaje |
|---|---|
| `400` | `No se recibió ningún archivo.` / `Tipo de archivo no permitido. Solo imágenes (JPG, PNG, WEBP, GIF) o PDF.` / tamaño excedido / campos faltantes |
| `404` | `Ticket no encontrado` |

## `GET /api/archivos/ticket/:id_ticket`

- **Rol**: Administrador, Tecnico. Todos los adjuntos del ticket (públicos y privados, sin filtrar).

## `GET /api/archivos/mis/ticket/:id_ticket`

- **Rol**: cualquiera autenticado (en la práctica, el Cliente).
- **Descripción**: solo los adjuntos marcados `publico = true` **y** que pertenezcan al ticket del usuario en sesión.
- **Errores**: `403 "No tienes permisos para ver los archivos de este ticket."` / `404 "Ticket no encontrado"`.

## `GET /api/archivos/:id/descargar`

- **Rol**: cualquiera autenticado — **el control de acceso vive enteramente en el service, no en la ruta.** Staff (Administrador/Tecnico/Recepcionista) siempre puede descargar. Cualquier otro rol (en la práctica, Cliente) necesita **ambas cosas**: `archivo.publico === true` y ser dueño del ticket.
- **Respuesta**: descarga binaria (`res.download`) con el nombre original del archivo.
- **Errores**: `403 "No tienes permisos para descargar este archivo."` / `404 "Archivo no encontrado"` (no existe en BD) / `404 "No se pudo descargar el archivo."` (existe en BD pero no en disco).

## `DELETE /api/archivos/:id`

- **Rol**: Administrador.
- **Descripción**: borra la fila y el archivo físico del disco. Si el archivo físico ya no está en disco, **no se considera un error** — el borrado de la fila igual se confirma.
