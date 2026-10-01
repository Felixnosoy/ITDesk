import { useState } from "react";
import { ESTADOS_TICKET, ETIQUETA_ESTADO } from "../constants/tickets";
import Modal from "./Modal";
import Insignia from "./Insignia";

// Por que un estado puede estar bloqueado antes de intentarlo. Las reglas
// las aplica el servidor; esto solo las explica para no hacer adivinar.
const motivoBloqueo = (estado, tieneDiagnostico) => {
    if (estado === ESTADOS_TICKET.ESPERANDO_APROBACION && !tieneDiagnostico) {
        return "Necesita un diagnóstico registrado.";
    }
    return "";
};

// Ventana para cambiar el estado del ticket. Solo ofrece los estados a los
// que se puede pasar desde el actual (estados_siguientes del servidor).
export default function CambioEstado({ estadoActual, siguientes, tieneDiagnostico, guardando, error, onGuardar, onCerrar }) {
    const [estado, setEstado] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [sinCosto, setSinCosto] = useState(false);

    const esResuelto = estado === ESTADOS_TICKET.RESUELTO;

    const enviar = (evento) => {
        evento.preventDefault();
        onGuardar({ estado, observaciones, sin_costo: esResuelto ? sinCosto : undefined });
    };

    return (
        <Modal titulo="Cambiar estado" onCerrar={onCerrar}>
            <form onSubmit={enviar}>
                <p className="estado-actual">
                    Estado actual: <Insignia tipo="estado" valor={estadoActual} />
                </p>

                {error && (
                    <div className="aviso aviso-error" role="alert">
                        {error}
                    </div>
                )}

                <fieldset className="estado-opciones">
                    <legend>Pasar a</legend>
                    {siguientes.map((opcion) => {
                        const bloqueo = motivoBloqueo(opcion, tieneDiagnostico);

                        return (
                            <label key={opcion} className={`estado-opcion${bloqueo ? " bloqueada" : ""}`}>
                                <input
                                    type="radio"
                                    name="estado"
                                    value={opcion}
                                    checked={estado === opcion}
                                    disabled={Boolean(bloqueo)}
                                    onChange={() => setEstado(opcion)}
                                />
                                <span>
                                    {ETIQUETA_ESTADO[opcion]}
                                    {bloqueo && <small>{bloqueo}</small>}
                                </span>
                            </label>
                        );
                    })}
                </fieldset>

                {esResuelto && (
                    <div className="estado-regla">
                        <p>
                            Para marcarlo como resuelto, el ticket necesita una cotización aprobada y facturada. Si el
                            trabajo no tuvo costo, decláralo aquí.
                        </p>
                        <label className="estado-check">
                            <input type="checkbox" checked={sinCosto} onChange={(e) => setSinCosto(e.target.checked)} />
                            El trabajo no tuvo costo
                        </label>
                    </div>
                )}

                <div className="campo">
                    <label htmlFor="estado-observaciones">Comentario para la línea de tiempo (opcional)</label>
                    <textarea
                        id="estado-observaciones"
                        rows={3}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                    />
                    <span className="campo-ayuda">El cliente también lo verá.</span>
                </div>

                <div className="modal-acciones">
                    <button type="button" className="boton boton-secundario" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className="boton" disabled={guardando || !estado}>
                        {guardando ? "Guardando..." : "Cambiar estado"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
