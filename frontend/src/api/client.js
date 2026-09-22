const BASE_URL = import.meta.env.VITE_API_URL;

// Envoltorio de fetch: agrega el token si existe, y traduce el contrato
// { success, message, data } del backend en una respuesta o un error JS.
export async function apiFetch(path, { method = "GET", body, token } = {}) {
    const headers = { "Content-Type": "application/json" };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const json = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        throw new Error(json?.message || "Ocurrió un error inesperado.");
    }

    return json;
}
