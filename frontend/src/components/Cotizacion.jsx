import { ESTADOS_COTIZACION } from "../constants/cotizaciones";
import { formatearFechaHora, formatearMonto } from "../utils/formato";
import Insignia from "./Insignia";
import Totales from "./Totales";
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

            <div className="tabla-envoltorio">
                <table className="cotizacion-tabla">
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th className="cotizacion-cantidad">Cant.</th>
                            <th className="cotizacion-monto">Precio unitario</th>
                            <th className="cotizacion-monto">Importe</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cotizacion.lineas.map((linea) => (
                            <tr key={linea.id_linea}>
                                <td>{linea.descripcion}</td>
                                <td className="cotizacion-cantidad">{linea.cantidad}</td>
                                <td className="cotizacion-monto">{formatearMonto(linea.precio_unitario)}</td>
                                <td className="cotizacion-monto">{formatearMonto(linea.importe)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
// historial no tape la que esta en juego.
export function SeccionCotizaciones({ cotizaciones, vacio }) {
    if (cotizaciones.length === 0) {
        return <p className="detalle-vacio">{vacio}</p>;
    }

    const [actual, ...anteriores] = cotizaciones;

    return (
        <>
            <Cotizacion cotizacion={actual} />
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
