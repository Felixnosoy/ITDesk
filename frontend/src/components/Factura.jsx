import { ESTADOS_FACTURA } from "../constants/cotizaciones";
import { codigoFactura, formatearFechaHora, formatearMonto } from "../utils/formato";
import Insignia from "./Insignia";
import Totales from "./Totales";
import TablaLineas from "./TablaLineas";
import "./Cotizacion.css";

// Factura del ticket. Los montos y las lineas son una copia de la
// cotizacion aprobada al momento de emitirla, asi que no cambian aunque
// despues se toque otra cosa del ticket. "pie" va al final (el pago).
export default function Factura({ factura, pie }) {
    return (
        <div className="cotizacion">
            <div className="cotizacion-cabecera">
                <strong>{codigoFactura(factura.id_factura)}</strong>
                <Insignia tipo="factura" valor={factura.estado} />
                <span className="detalle-autor">
                    Emitida por {factura.emitida_por} · {formatearFechaHora(factura.fecha_emision)}
                </span>
            </div>

            <TablaLineas lineas={factura.lineas} />

            <Totales montos={factura} />

            {factura.estado === ESTADOS_FACTURA.PAGADA && <Comprobante factura={factura} />}

            {pie}
        </div>
    );
}

// Comprobante del pago: solo lo que guardo el servidor (referencia, fecha y
// ultimos 4 digitos). El numero completo de la tarjeta nunca se guarda.
function Comprobante({ factura }) {
    return (
        <div className="comprobante">
            <h3>Pago recibido</h3>
            <dl>
                <dt>Fecha</dt>
                <dd>{formatearFechaHora(factura.fecha_pago)}</dd>
                <dt>Monto</dt>
                <dd>{formatearMonto(factura.total)}</dd>
                <dt>Referencia</dt>
                <dd>{factura.referencia_pago}</dd>
                <dt>Tarjeta</dt>
                <dd>Terminada en {factura.tarjeta_ultimos4}</dd>
            </dl>
        </div>
    );
}
