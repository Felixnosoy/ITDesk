import "./PildoraNuevo.css";

// Aviso de que el ticket tuvo movimiento desde la ultima vez que se abrio en
// este navegador (ver utils/novedades.js). El punto no depende solo del
// color: la palabra "Nuevo" dice lo mismo.
export default function PildoraNuevo() {
    return (
        <span className="pildora-nuevo" title="Hay novedades desde tu última visita">
            <span className="pildora-nuevo-punto" aria-hidden="true" />
            Nuevo
        </span>
    );
}
