import { apiFetch } from "./client";

// filtros del servidor: estado, prioridad y categoria (vacios no se mandan)
export async function listarTickets(token, filtros = {}) {
    const parametros = new URLSearchParams();

    for (const campo of ["estado", "prioridad", "categoria"]) {
        if (filtros[campo]) parametros.set(campo, filtros[campo]);
    }

    const consulta = parametros.toString();
    const respuesta = await apiFetch(`/tickets${consulta ? `?${consulta}` : ""}`, { token });

    return respuesta.data;
}

// detalle completo; para el Cliente no trae notas_privadas ni estados_siguientes
export async function obtenerDetalle(token, id) {
    const respuesta = await apiFetch(`/tickets/${id}`, { token });

    return respuesta.data;
}
