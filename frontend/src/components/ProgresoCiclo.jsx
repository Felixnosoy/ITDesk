import { PASOS_CICLO, indicePaso } from "../utils/ciclo";
import "./ProgresoCiclo.css";

// Barra con las seis etapas del ticket: las pasadas en el color del rol, la
// actual resaltada y las que faltan en gris. compacta quita las etiquetas
// para las tarjetas del inicio.
export default function ProgresoCiclo({ estado, compacta = false }) {
    const actual = indicePaso(estado);
    const etiquetaActual = PASOS_CICLO[actual]?.etiqueta ?? estado;

    return (
        <ol
            className={`progreso${compacta ? " progreso-compacta" : ""}`}
            aria-label={`Etapa ${actual + 1} de ${PASOS_CICLO.length}: ${etiquetaActual}`}
        >
            {PASOS_CICLO.map((paso, indice) => {
                const clase = indice < actual ? "hecho" : indice === actual ? "actual" : "pendiente";

                return (
                    <li key={paso.estado} className={`progreso-paso progreso-${clase}`} aria-current={indice === actual ? "step" : undefined}>
                        <span className="progreso-barra" aria-hidden="true" />
                        {!compacta && <span className="progreso-etiqueta">{paso.etiqueta}</span>}
                    </li>
                );
            })}
        </ol>
    );
}
