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

// registra o reemplaza el diagnostico (uno solo vigente por ticket)
export async function registrarDiagnostico(token, id, { diagnostico, solucion, observaciones }) {
    const respuesta = await apiFetch(`/tickets/${id}/diagnostico`, {
        method: "PUT",
        token,
        body: { diagnostico, solucion, observaciones },
    });

    return respuesta.data;
}

// sin_costo solo se manda al pasar a Resuelto
export async function cambiarEstado(token, id, { estado, observaciones, sin_costo }) {
    const respuesta = await apiFetch(`/tickets/${id}/estado`, {
        method: "PATCH",
        token,
        body: { estado, observaciones, sin_costo },
    });

    return respuesta.data;
}
