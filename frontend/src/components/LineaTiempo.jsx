import { formatearFechaHora } from "../utils/formato";
import Insignia from "./Insignia";
import "./LineaTiempo.css";

// Linea de tiempo del ticket: cambios de estado y avances del tecnico, lo
// mas reciente arriba. El servidor la manda de la mas vieja a la mas nueva;
// aqui solo se invierte. renderAdjuntos dibuja las imagenes de cada avance.
export default function LineaTiempo({ actualizaciones, renderAdjuntos }) {
    if (actualizaciones.length === 0) {
        return <p className="linea-vacia">Todavía no hay novedades.</p>;
    }

    const recientesPrimero = [...actualizaciones].reverse();

    return (
        <ol className="linea-tiempo">
            {recientesPrimero.map((item) => {
                const esEstado = item.tipo === "Estado";

                return (
                    <li key={item.id_actualizacion} className={`linea-item linea-item-${esEstado ? "estado" : "avance"}`}>
                        <span className="linea-punto" aria-hidden="true" />
                        <div className="linea-contenido">
                            <div className="linea-titulo">
                                {esEstado ? (
                                    <>
                                        Cambió el estado a <Insignia tipo="estado" valor={item.estado} />
                                    </>
                                ) : (
                                    "Avance del técnico"
                                )}
                            </div>
                            {item.observaciones && <p className="linea-texto">{item.observaciones}</p>}
                            {renderAdjuntos && item.adjuntos?.length > 0 && renderAdjuntos(item.adjuntos)}
                            <span className="linea-autor">
                                {item.usuario} · <time dateTime={item.fecha}>{formatearFechaHora(item.fecha)}</time>
                            </span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
