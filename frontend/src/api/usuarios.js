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
