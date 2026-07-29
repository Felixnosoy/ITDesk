//========================================
// ITDESK - API
//========================================
// Wrapper unico para hablar con el backend real. Arma la URL, agrega el
// Bearer token si hay sesion, y traduce la respuesta { success, message,
// data } del backend a algo facil de usar: devuelve "data" si success es
// true, o lanza un Error con el mensaje del backend si no.

const API_URL = "http://localhost:3000/api";

async function apiFetch(endpoint, opciones = {}) {
    const headers = {
        // si el body es FormData (subida de archivos), no se fuerza el
        // Content-Type: el navegador arma el multipart/form-data con su
        // propio boundary solo — fijarlo a mano rompe la subida.
        ...(opciones.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(opciones.headers || {})
    };

    const token = typeof Auth !== "undefined" ? Auth.getToken() : null;
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let respuesta;
    try {
        respuesta = await fetch(`${API_URL}${endpoint}`, { ...opciones, headers });
    } catch (error) {
        throw new Error("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
    }

    const cuerpo = await respuesta.json().catch(() => null);

    if (!respuesta.ok || !cuerpo || cuerpo.success === false) {
        const mensaje = cuerpo && cuerpo.message ? cuerpo.message : "Ocurrió un error inesperado.";

        // 401 fuera de /auth/login siempre significa token invalido o
        // vencido (el login tambien devuelve 401 para credenciales
        // incorrectas, asi que se excluye explicitamente). En vez de que
        // cada pantalla muestre el mensaje crudo del backend en una fila de
        // tabla o un toast, se cierra la sesion y se redirige una sola vez.
        if (respuesta.status === 401 && endpoint !== "/auth/login" && typeof Auth !== "undefined") {
            Auth.cerrarPorSesionVencida();
        }

        const error = new Error(mensaje);
        error.status = respuesta.status;
        throw error;
    }

    return cuerpo.data;
}
