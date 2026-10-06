import { formatearMonto } from "../utils/formato";

// Subtotal, ITBIS y total alineados a la derecha. Lo usan el editor de la
// cotizacion (montos en vivo), la cotizacion guardada y la factura.
export default function Totales({ montos }) {
    return (
        <dl className="cotizacion-totales">
            <div>
                <dt>Subtotal</dt>
                <dd>{formatearMonto(montos.subtotal)}</dd>
            </div>
            <div>
                <dt>ITBIS (18%)</dt>
                <dd>{formatearMonto(montos.itbis)}</dd>
            </div>
            <div className="cotizacion-total">
                <dt>Total</dt>
                <dd>{formatearMonto(montos.total)}</dd>
            </div>
        </dl>
    );
}
