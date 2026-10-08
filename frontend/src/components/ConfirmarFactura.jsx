import { formatearMonto } from "../utils/formato";
import Modal from "./Modal";

// Confirmacion antes de emitir: la factura no se puede anular ni volver a
// generar (el servidor responde 409), y con ella el ticket ya se puede
// pasar a Resuelto.
export default function ConfirmarFactura({ cotizacion, guardando, error, onConfirmar, onCerrar }) {
    return (
        <Modal titulo="Generar factura" onCerrar={onCerrar}>
            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}
            <p className="decision-total">
                Total a facturar: <strong>{formatearMonto(cotizacion.total)}</strong>
            </p>
            <p className="decision-texto">
                La factura copia las líneas y los montos de la cotización aprobada. Una vez emitida no se puede
                cambiar, y el cliente la verá en su ticket para pagarla.
            </p>
            <div className="modal-acciones">
                <button type="button" className="boton boton-secundario" onClick={onCerrar}>
                    Volver
                </button>
                <button type="button" className="boton" disabled={guardando} onClick={onConfirmar}>
                    {guardando ? "Generando..." : "Generar factura"}
                </button>
            </div>
        </Modal>
    );
}
