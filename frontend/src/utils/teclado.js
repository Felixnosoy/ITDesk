// Un atajo de una sola tecla no debe dispararse mientras se escribe en un
// campo, con una ventana abierta o con Ctrl/Alt/Cmd apretado (esos son del
// navegador o de otro atajo).
export function esAtajoLibre(evento) {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return false;
    if (evento.target.closest?.("input, textarea, select, [contenteditable=true]")) return false;
    if (document.querySelector("[role=dialog]")) return false;
    return true;
}
