← [Volver al índice de la API](../06-api.md)

# Autenticación — `/api/auth`

Ver también [07-autenticacion.md](../07-autenticacion.md) para el flujo completo, la forma del JWT y el middleware.

## `POST /api/auth/login`

- **Autenticación**: ninguna (es el endpoint que emite el token).
- **Rol**: ninguno.
- **Descripción**: valida credenciales y devuelve un JWT + los datos del usuario autenticado.

### Body esperado

```json
{
  "correo": "tecnico@itdesk.local",
  "contraseña": "ClaveSegura123!"
}
```

### Respuesta exitosa (200)

```json
{
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id_usuario": 4,
      "nombre": "Ana",
      "apellido": "Pérez",
      "correo": "tecnico@itdesk.local",
      "rol": "Tecnico",
      "estado": "Activo"
    }
  }
}
```

El hash de la contraseña se excluye explícitamente de la respuesta.

### Errores

| Status | Mensaje | Cuándo |
|---|---|---|
| `400` | `Correo y contraseña son requeridos` | Falta `correo` o `contraseña` en el body |
| `401` | `Correo o contraseña incorrectos` | El correo no existe, **o** la contraseña no coincide (mismo mensaje para ambos casos, deliberado por seguridad) |
| `403` | `El usuario esta inactivo` | El usuario existe y la contraseña es correcta, pero `estado !== "Activo"` |

No hay endpoint de logout (JWT es *stateless*), ni de refresco de token, ni de registro público de cuentas — crear usuarios es siempre una operación de staff (`POST /api/usuarios`, ver [api/usuarios.md](usuarios.md)).
