import { useState } from "react";
import { ESTADOS_COTIZACION } from "../constants/cotizaciones";
import { formatearMonto } from "../utils/formato";
import Modal from "./Modal";

const MAXIMO_MOTIVO = 1000;

// Confirmacion antes de aprobar o rechazar. La decision no se puede
// deshacer (el servidor responde 409 si se intenta otra vez), por eso el
// cliente ve el total y lo que va a pasar con su ticket antes de confirmar.
export default function DecisionCotizacion({ cotizacion, decision, guardando, error, onConfirmar, onCerrar }) {
    const [motivo, setMotivo] = useState("");
    const aprueba = decision === ESTADOS_COTIZACION.APROBADA;

    const enviar = (evento) => {
        evento.preventDefault();
        onConfirmar({ estado: decision, motivo: aprueba ? undefined : motivo });
    };

    return (
        <Modal titulo={aprueba ? "Aprobar cotización" : "Rechazar cotización"} onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                {error && (
                    <div className="aviso aviso-error" role="alert">
                        {error}
                    </div>
                )}

                <p className="decision-total">
                    Total de la cotización: <strong>{formatearMonto(cotizacion.total)}</strong>
                </p>

                {aprueba ? (
                    <p className="decision-texto">
                        Al aprobarla autorizas la reparación por ese monto y el técnico empieza a trabajar en tu
                        equipo. Después no se puede cambiar.
                    </p>
                ) : (
                    <>
                        <p className="decision-texto">
                            Al rechazarla el técnico no hará la reparación con este presupuesto y podrá prepararte
                            otra cotización. Después no se puede cambiar.
                        </p>
                        <div className="campo">
                            <label htmlFor="decision-motivo">Motivo (opcional)</label>
                            <textarea
                                id="decision-motivo"
                                rows={3}
                                maxLength={MAXIMO_MOTIVO}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Por ejemplo: el precio es muy alto, prefiero no cambiar la pieza..."
                            />
                            <span className="campo-ayuda">El técnico lo verá en tu ticket.</span>
                        </div>
                    </>
                )}

                <div className="modal-acciones">
                    <button type="button" className="boton boton-secundario" onClick={onCerrar}>
                        Volver
                    </button>
                    <button type="submit" className={`boton${aprueba ? "" : " boton-peligro"}`} disabled={guardando}>
                        {guardando ? "Enviando..." : aprueba ? "Sí, aprobar" : "Sí, rechazar"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
