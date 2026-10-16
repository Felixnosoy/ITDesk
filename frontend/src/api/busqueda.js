import { apiFetch } from "./client";

// Busqueda global: { tickets, equipos, clientes, personal }. El servidor
// decide que puede ver cada rol (el cliente solo lo suyo).
export async function buscarGlobal(token, texto) {
    const respuesta = await apiFetch(`/busqueda?q=${encodeURIComponent(texto)}`, { token });

    return respuesta.data;
}
