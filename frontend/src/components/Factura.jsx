import { codigoFactura, formatearFechaHora } from "../utils/formato";
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

            {pie}
        </div>
    );
}
