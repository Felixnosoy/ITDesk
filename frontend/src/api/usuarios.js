import { apiFetch } from "./client";

export async function obtenerUsuario(token, id) {
    const respuesta = await apiFetch(`/usuarios/${id}`, { token });

    return respuesta.data;
}

// el backend solo acepta telefono y direccion en esta ruta
export async function actualizarPerfil(token, id, { telefono, direccion }) {
    const respuesta = await apiFetch(`/usuarios/${id}/perfil`, {
        method: "PATCH",
        token,
        body: { telefono, direccion },
    });

    return respuesta.data;
}

// el propio usuario cambia su clave: el backend exige la actual para confirmar
export async function cambiarContrasena(token, id, contraseñaActual, contraseñaNueva) {
    await apiFetch(`/usuarios/${id}/clave`, {
        method: "PATCH",
        token,
        body: { contraseñaActual, contraseñaNueva },
    });
}

export async function listarUsuarios(token) {
    const respuesta = await apiFetch("/usuarios", { token });

    return respuesta.data;
}

export async function crearUsuario(token, datos) {
    const respuesta = await apiFetch("/usuarios", { method: "POST", token, body: datos });

    return respuesta.data;
}

// PUT reemplaza todos los campos editables: hay que mandarlos completos
export async function actualizarUsuario(token, id, datos) {
    const respuesta = await apiFetch(`/usuarios/${id}`, { method: "PUT", token, body: datos });

    return respuesta.data;
}

// los usuarios no se borran: se pasan a Activo o Inactivo
export async function cambiarEstadoUsuario(token, id, estado) {
    const respuesta = await apiFetch(`/usuarios/${id}/estado`, {
        method: "PATCH",
        token,
        body: { estado },
    });

    return respuesta.data;
}

// un administrador fija una clave nueva sin conocer la anterior
export async function resetearContrasena(token, id, contraseñaNueva) {
    await apiFetch(`/usuarios/${id}/clave/reset`, {
        method: "PATCH",
        token,
        body: { contraseñaNueva },
    });
}
