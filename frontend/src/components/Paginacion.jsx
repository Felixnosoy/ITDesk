import "./Paginacion.css";

// Controles de pagina anterior/siguiente. Con una sola pagina no se muestra
// nada, para no ocupar espacio en listados cortos.
export default function Paginacion({ pagina, totalPaginas, onCambiar }) {
    if (totalPaginas <= 1) return null;

    return (
        <nav className="paginacion" aria-label="Paginación">
            <button
                type="button"
                className="boton boton-chico boton-secundario"
                disabled={pagina <= 1}
                onClick={() => onCambiar(pagina - 1)}
            >
                Anterior
            </button>
            <span className="paginacion-texto" aria-live="polite">
                Página {pagina} de {totalPaginas}
            </span>
            <button
                type="button"
                className="boton boton-chico boton-secundario"
                disabled={pagina >= totalPaginas}
                onClick={() => onCambiar(pagina + 1)}
            >
                Siguiente
            </button>
        </nav>
    );
}
