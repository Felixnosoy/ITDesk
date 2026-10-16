import { formatearFechaHora } from "../../utils/formato";
import FormularioDiagnostico from "../FormularioDiagnostico";
import Dato from "./Dato";

// Diagnostico del tecnico: se lee, o se registra y edita en la misma tarjeta
export default function SeccionDiagnostico({
    diagnostico,
    esTaller,
    puedeEditar,
    editando,
    guardando,
    error,
    onEditar,
    onCancelar,
    onGuardar,
}) {
    return (
        <div className="tarjeta" id="seccion-diagnostico">
            <div className="detalle-titulo-fila">
                <h2>Diagnóstico</h2>
                {puedeEditar && !editando && (
                    <button type="button" className="boton boton-chico boton-secundario" onClick={onEditar}>
                        {diagnostico ? "Editar" : "Registrar diagnóstico"}
                    </button>
                )}
            </div>
            {editando ? (
                <FormularioDiagnostico
                    diagnostico={diagnostico}
                    guardando={guardando}
                    error={error}
                    onCancelar={onCancelar}
                    onGuardar={onGuardar}
                />
            ) : diagnostico ? (
                <dl className="detalle-datos">
                    <Dato etiqueta="Diagnóstico">
                        <span className="detalle-texto">{diagnostico.diagnostico}</span>
                    </Dato>
                    {diagnostico.solucion && (
                        <Dato etiqueta="Solución propuesta">
                            <span className="detalle-texto">{diagnostico.solucion}</span>
                        </Dato>
                    )}
                    {diagnostico.observaciones && (
                        <Dato etiqueta="Observaciones">
                            <span className="detalle-texto">{diagnostico.observaciones}</span>
                        </Dato>
                    )}
                    <Dato etiqueta="Registrado por">
                        {diagnostico.tecnico} · {formatearFechaHora(diagnostico.fecha_edicion ?? diagnostico.fecha_diagnostico)}
                        {diagnostico.fecha_edicion && " (editado)"}
                    </Dato>
                </dl>
            ) : (
                <p className="detalle-vacio">
                    {esTaller
                        ? "Todavía no tiene diagnóstico. Sin diagnóstico el ticket no se puede cotizar."
                        : "El técnico todavía está revisando tu equipo."}
                </p>
            )}
        </div>
    );
}
