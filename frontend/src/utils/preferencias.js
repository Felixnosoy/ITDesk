// Preferencias de la interfaz que cada persona elige y se recuerdan en este
// navegador (como el tema). Si el almacenamiento no esta disponible (modo
// privado) se usa el valor por defecto y la eleccion vale solo esta visita.
const CLAVE_MENU_PLEGADO = "itdesk_menu_plegado";

export function leerMenuPlegado() {
    try {
        return localStorage.getItem(CLAVE_MENU_PLEGADO) === "1";
    } catch {
        return false;
    }
}

export function guardarMenuPlegado(plegado) {
    try {
        localStorage.setItem(CLAVE_MENU_PLEGADO, plegado ? "1" : "0");
    } catch {
        // sin almacenamiento: queda aplicado solo en esta visita
    }
}
