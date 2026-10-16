import { ESTADOS_COTIZACION } from "../../constants/cotizaciones";
import { formatearMonto } from "../../utils/formato";
import EditorCotizacion from "../EditorCotizacion";
import { SeccionCotizaciones } from "../Cotizacion";

// Cotizacion del ticket: la vigente con su historial, el editor para armar
// una nueva y, para el cliente, aprobar o rechazar.
export default function SeccionCotizacion({
    permisos,
    hayFactura,
    editando,
    guardando,
    error,
    onImprimir,
    onCrear,
    onDecidir,
    onCancelar,
    onGuardar,
}) {
    const { cotizaciones, pendiente, aprobada, puedeCotizar, puedeDecidir, esTaller } = permisos;

    // el cliente decide; el taller ve que esta esperando la respuesta
    const acciones = puedeDecidir ? (
        <div className="cotizacion-acciones no-imprimir">
            <p>¿Autorizas la reparación por este monto?</p>
            <button type="button" className="boton boton-secundario" onClick={() => onDecidir(ESTADOS_COTIZACION.RECHAZADA)}>
                Rechazar
            </button>
            <button type="button" className="boton" onClick={() => onDecidir(ESTADOS_COTIZACION.APROBADA)}>
                Aprobar
            </button>
        </div>
    ) : pendiente && esTaller ? (
        <p className="cotizacion-espera">
            Esperando la decisión del cliente. El ticket se mueve solo cuando apruebe o rechace.
        </p>
    ) : null;

    return (
        <div className="tarjeta" id="seccion-cotizacion">
            <div className="detalle-titulo-fila">
                <h2>Cotización</h2>
                {cotizaciones[0] && !editando && (
                    <button type="button" className="boton boton-chico boton-secundario detalle-imprimir" onClick={onImprimir}>
                        Imprimir
                    </button>
                )}
                {puedeCotizar && !editando && (
                    <button type="button" className="boton boton-chico boton-secundario" onClick={onCrear}>
                        {cotizaciones.length > 0 ? "Nueva cotización" : "Crear cotización"}
                    </button>
                )}
            </div>
            {editando ? (
                <EditorCotizacion guardando={guardando} error={error} onCancelar={onCancelar} onGuardar={onGuardar} />
            ) : hayFactura && aprobada ? (
                // con factura emitida la cotizacion repite las mismas lineas:
                // queda plegada para no duplicar la tabla
                <details className="detalle-plegable">
                    <summary>Aprobada por {formatearMonto(aprobada.total)} · ver detalle</summary>
                    <SeccionCotizaciones cotizaciones={cotizaciones} vacio="" />
                </details>
            ) : (
                <SeccionCotizaciones
                    cotizaciones={cotizaciones}
                    vacio="Todavía no hay cotización para este ticket."
                    acciones={acciones}
                />
            )}
        </div>
    );
}
