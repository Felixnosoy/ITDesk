import { ESTADOS_FACTURA } from "../../constants/cotizaciones";
import { codigoCotizacion, codigoFactura, formatearFechaHora } from "../../utils/formato";
import DocumentoImprimible from "../DocumentoImprimible";
import Insignia from "../Insignia";

const PIE_MONTOS = "Montos en pesos dominicanos (RD$). El total incluye ITBIS del 18%.";

// La version en papel de la cotizacion o la factura: mientras se imprime,
// la pantalla queda oculta y sale solo el documento.
export default function DocumentosImprimibles({ imprimiendo, ticket, cotizacion, factura }) {
    if (imprimiendo === "cotizacion" && cotizacion) {
        return (
            <DocumentoImprimible
                titulo="Cotización"
                numero={codigoCotizacion(cotizacion.id_cotizacion)}
                fecha={cotizacion.fecha_creacion}
                ticket={ticket}
                estado={<Insignia tipo="cotizacion" valor={cotizacion.estado} />}
                documento={cotizacion}
            >
                {cotizacion.observaciones && (
                    <p className="documento-nota">
                        <strong>Observaciones:</strong> {cotizacion.observaciones}
                    </p>
                )}
                {cotizacion.motivo_rechazo && (
                    <p className="documento-nota">
                        <strong>Motivo del rechazo:</strong> {cotizacion.motivo_rechazo}
                    </p>
                )}
                <footer className="documento-pie">
                    <p>{PIE_MONTOS}</p>
                    <p>Preparada por {cotizacion.creada_por}.</p>
                </footer>
            </DocumentoImprimible>
        );
    }

    if (imprimiendo === "factura" && factura) {
        return (
            <DocumentoImprimible
                titulo="Factura"
                numero={codigoFactura(factura.id_factura)}
                fecha={factura.fecha_emision}
                ticket={ticket}
                estado={<Insignia tipo="factura" valor={factura.estado} />}
                documento={factura}
            >
                {factura.estado === ESTADOS_FACTURA.PAGADA ? (
                    <p className="documento-nota">
                        <strong>Pagada</strong> el {formatearFechaHora(factura.fecha_pago)} con la tarjeta terminada en{" "}
                        {factura.tarjeta_ultimos4}. Referencia del pago: {factura.referencia_pago}.
                    </p>
                ) : (
                    <p className="documento-nota">
                        <strong>Pendiente de pago.</strong>
                    </p>
                )}
                <footer className="documento-pie">
                    <p>{PIE_MONTOS}</p>
                    <p>Emitida por {factura.emitida_por}.</p>
                </footer>
            </DocumentoImprimible>
        );
    }

    return null;
}
