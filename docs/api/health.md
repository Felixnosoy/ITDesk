← [Volver al índice de la API](../06-api.md)

# Salud del sistema — `/api/health`

## `GET /api/health`

- **Autenticación**: ninguna.
- **Rol**: ninguno.
- **Descripción**: pensado para verificar que la API y la conexión a la base de datos funcionan.
- **Parámetros / body**: ninguno.

### ⚠️ Endpoint roto — siempre devuelve 500

Este endpoint tiene dos bugs combinados en el código actual:

1. `health.service.js` exporta la función de chequeo directamente (`module.exports = checkDataBase`), pero `health.controller.js` la importa como si fuera un objeto con métodos (`healthService.checkDataBase()`) — eso hace que la llamada sea `undefined()` y explote.
2. El controller además referencia una variable `rows` que nunca se declaró en su scope.

**Resultado real**: toda llamada a `GET /api/health` cae en el `catch` y responde:

```json
{ "success": false, "message": "Error al conectar con la base de datos" }
```

con status `500`, **sin importar si la base de datos está realmente funcionando o no**. No usar este endpoint como diagnóstico hasta que se corrija — ver [14-problemas-conocidos.md](../14-problemas-conocidos.md), hallazgo A.

### Respuesta esperada (si se corrigiera)

```json
{
  "message": "API y Base de Datos funcionando correctamente",
  "database": { "status": 1 }
}
```
