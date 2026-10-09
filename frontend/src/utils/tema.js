// Tema claro u oscuro (issue HU27.5). La eleccion de cada persona se guarda
// en este navegador; si nunca eligio, se sigue la preferencia del sistema.
// El tema va en <html data-tema="...">, de ahi lo toman los tokens.
const CLAVE_TEMA = "itdesk_tema";

export const TEMAS = { CLARO: "claro", OSCURO: "oscuro" };

export function leerTema() {
    try {
        const guardado = localStorage.getItem(CLAVE_TEMA);
        if (guardado === TEMAS.CLARO || guardado === TEMAS.OSCURO) return guardado;
    } catch {
        // sin acceso al almacenamiento (modo privado): se usa el del sistema
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? TEMAS.OSCURO : TEMAS.CLARO;
}

export function aplicarTema(tema) {
    document.documentElement.dataset.tema = tema;
}

export function guardarTema(tema) {
    aplicarTema(tema);
    try {
        localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
        // si no se puede guardar, igual queda aplicado en esta visita
    }
}
