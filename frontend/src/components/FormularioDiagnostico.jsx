import { useState } from "react";

// Formulario para registrar o editar el diagnostico. Solo "diagnostico" es
// obligatorio; el servidor guarda uno solo por ticket y lo reemplaza.
export default function FormularioDiagnostico({ diagnostico, guardando, error, onGuardar, onCancelar }) {
    const [valores, setValores] = useState({
        diagnostico: diagnostico?.diagnostico ?? "",
        solucion: diagnostico?.solucion ?? "",
        observaciones: diagnostico?.observaciones ?? "",
    });

    const cambiar = (campo) => (evento) => setValores({ ...valores, [campo]: evento.target.value });

    const enviar = (evento) => {
        evento.preventDefault();
        onGuardar(valores);
    };

    return (
        <form onSubmit={enviar}>
            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}
            <div className="campo">
                <label htmlFor="diag-diagnostico">Diagnóstico</label>
                <textarea
                    id="diag-diagnostico"
                    rows={4}
                    value={valores.diagnostico}
                    onChange={cambiar("diagnostico")}
                    placeholder="Qué tiene el equipo y por qué falla."
                    required
                />
            </div>
            <div className="campo">
                <label htmlFor="diag-solucion">Solución propuesta (opcional)</label>
                <textarea id="diag-solucion" rows={3} value={valores.solucion} onChange={cambiar("solucion")} />
            </div>
            <div className="campo">
                <label htmlFor="diag-observaciones">Observaciones (opcional)</label>
                <textarea id="diag-observaciones" rows={2} value={valores.observaciones} onChange={cambiar("observaciones")} />
            </div>
            <div className="modal-acciones">
                <button type="button" className="boton boton-secundario" onClick={onCancelar}>
                    Cancelar
                </button>
                <button type="submit" className="boton" disabled={guardando || !valores.diagnostico.trim()}>
                    {guardando ? "Guardando..." : "Guardar diagnóstico"}
                </button>
            </div>
        </form>
    );
}
