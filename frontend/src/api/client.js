const BASE_URL = import.meta.env.VITE_API_URL;

// Evento que se dispara cuando el servidor rechaza el token de una sesion
// activa (vencido o invalido): AuthContext lo escucha y cierra la sesion.
export const EVENTO_SESION_EXPIRADA = "itdesk:sesion-expirada";

// Envoltorio de fetch: agrega el token si existe, y traduce el contrato
// { success, message, data } del backend en una respuesta o un error JS.
export async function apiFetch(path, { method = "GET", body, token } = {}) {
    const headers = { "Content-Type": "application/json" };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let respuesta;

    try {
        respuesta = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error("No se pudo conectar con el servidor.");
    }

    const json = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        // un 401 con token enviado significa que la sesion ya no vale
        // (en el login no hay token, ahi un 401 es solo "credenciales malas")
        if (respuesta.status === 401 && token) {
            window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
        }

        throw new Error(json?.message || "Ocurrió un error inesperado.");
    }

    return json;
}
