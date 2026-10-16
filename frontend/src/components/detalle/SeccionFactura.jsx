import Factura from "../Factura";

// Factura del ticket: la emitida (con el pago para el cliente) o, si la
// cotizacion ya esta aprobada, el aviso de que falta generarla.
export default function SeccionFactura({ factura, puedeFacturar, puedePagar, onImprimir, onGenerar, onPagar }) {
    return (
        <div className="tarjeta">
            <div className="detalle-titulo-fila">
                <h2>Factura</h2>
                {factura && (
                    <button type="button" className="boton boton-chico boton-secundario detalle-imprimir" onClick={onImprimir}>
                        Imprimir
                    </button>
                )}
                {puedeFacturar && (
                    <button type="button" className="boton boton-chico" onClick={onGenerar}>
                        Generar factura
                    </button>
                )}
            </div>
            {factura ? (
                <Factura
                    factura={factura}
                    pie={
                        puedePagar && (
                            <div className="factura-pie no-imprimir">
                                <p>Esta factura está pendiente de pago.</p>
                                <button type="button" className="boton" onClick={onPagar}>
                                    Pagar en línea
                                </button>
                            </div>
                        )
                    }
                />
            ) : (
                <p className="detalle-vacio">
                    La cotización está aprobada y todavía no se emitió la factura.
                    {puedeFacturar && " Genérala cuando el trabajo esté listo para cobrar."}
                </p>
            )}
        </div>
    );
}
