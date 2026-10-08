import { BASE_URL, EVENTO_SESION_EXPIRADA } from "./client";

// Descarga una imagen adjunta. Las urls de los adjuntos piden el token, asi
// que un <img src> directo no sirve: se pide con fetch y se devuelve el
// archivo para mostrarlo con URL.createObjectURL. url viene del servidor
// como "/api/archivos/:id" y VITE_API_URL ya termina en /api.
export async function descargarImagen(token, url) {
    const respuesta = await fetch(`${BASE_URL}${url.replace(/^\/api/, "")}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (respuesta.status === 401) {
        window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    }

    if (!respuesta.ok) {
        throw new Error("No se pudo cargar la imagen.");
    }

    return respuesta.blob();
}
