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

// Avance publico o nota privada, con imagenes opcionales. tipo es
// "actualizaciones" o "notas"; el texto va en el campo que espera cada uno.
export async function registrarSeguimiento(token, id, tipo, texto, imagenes = []) {
    const datos = new FormData();
    datos.append(tipo === "notas" ? "contenido" : "observaciones", texto);
    imagenes.forEach((imagen) => datos.append("imagenes", imagen));

    const respuesta = await apiFetch(`/tickets/${id}/${tipo}`, { method: "POST", token, body: datos });

    return respuesta.data;
}

// clientes activos por nombre, documento o correo (minimo 2 caracteres)
export async function buscarClientes(token, busqueda) {
    const respuesta = await apiFetch(`/usuarios/clientes?busqueda=${encodeURIComponent(busqueda)}`, { token });

    return respuesta.data;
}

export async function listarEquipos(token, idCliente) {
    const respuesta = await apiFetch(`/equipos?id_cliente=${idCliente}`, { token });

    return respuesta.data;
}

export async function crearEquipo(token, datos) {
    const respuesta = await apiFetch("/equipos", { method: "POST", token, body: datos });

    return respuesta.data;
}

// ticket a nombre de un cliente, ya asignado a un tecnico
export async function crearTicket(token, datos) {
    const respuesta = await apiFetch("/tickets", { method: "POST", token, body: datos });

    return respuesta.data;
}
