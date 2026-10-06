import { ESTADOS_COTIZACION } from "../constants/cotizaciones";
import { formatearFechaHora } from "../utils/formato";
import Insignia from "./Insignia";
import Totales from "./Totales";
import TablaLineas from "./TablaLineas";
import "./Cotizacion.css";

// Una cotizacion guardada: sus lineas, los montos que calculo el servidor y,
// si ya se decidio, quien la decidio y por que. El taller y el cliente ven
// lo mismo; las acciones (aprobar, rechazar, facturar) las pone quien la usa.
export default function Cotizacion({ cotizacion }) {
    const rechazada = cotizacion.estado === ESTADOS_COTIZACION.RECHAZADA;

    return (
        <div className="cotizacion">
            <div className="cotizacion-cabecera">
                <Insignia tipo="cotizacion" valor={cotizacion.estado} />
                <span className="detalle-autor">
                    {cotizacion.creada_por} · {formatearFechaHora(cotizacion.fecha_creacion)}
                </span>
            </div>

            <TablaLineas lineas={cotizacion.lineas} />

            <Totales montos={cotizacion} />

            {cotizacion.observaciones && (
                <p className="detalle-texto cotizacion-nota">
                    <strong>Observaciones:</strong> {cotizacion.observaciones}
                </p>
            )}

            {cotizacion.fecha_decision && (
                <p className="cotizacion-decision">
                    {rechazada ? "Rechazada" : "Aprobada"} por el cliente el {formatearFechaHora(cotizacion.fecha_decision)}.
                    {rechazada && cotizacion.motivo_rechazo && (
                        <span className="detalle-texto"> Motivo: {cotizacion.motivo_rechazo}</span>
                    )}
                </p>
            )}
        </div>
    );
}

// Tarjeta completa del detalle del ticket: la cotizacion actual arriba y las
// anteriores (por ejemplo una rechazada) plegadas debajo, para que el
// historial no tape la que esta en juego. "acciones" va debajo de la actual
// (los botones del cliente o el aviso de espera del taller).
export function SeccionCotizaciones({ cotizaciones, vacio, acciones }) {
    if (cotizaciones.length === 0) {
        return <p className="detalle-vacio">{vacio}</p>;
    }

    const [actual, ...anteriores] = cotizaciones;

    return (
        <>
            <Cotizacion cotizacion={actual} />
            {acciones}
            {anteriores.length > 0 && (
                <details className="cotizacion-historial">
                    <summary>
                        {anteriores.length === 1 ? "1 cotización anterior" : `${anteriores.length} cotizaciones anteriores`}
                    </summary>
                    {anteriores.map((cotizacion) => (
                        <Cotizacion key={cotizacion.id_cotizacion} cotizacion={cotizacion} />
                    ))}
                </details>
            )}
        </>
    );
}
