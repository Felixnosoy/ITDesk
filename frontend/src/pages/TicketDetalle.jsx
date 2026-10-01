import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerDetalle } from "../api/tickets";
import { codigoTicket, formatearFecha, formatearFechaHora } from "../utils/formato";
import Insignia from "../components/Insignia";
import "./TicketDetalle.css";

const Dato = ({ etiqueta, children }) => (
    <div className="detalle-dato">
        <dt>{etiqueta}</dt>
        <dd>{children}</dd>
    </div>
);

// Detalle de un ticket en una sola pantalla: resumen, cliente, equipo,
// tecnico, descripcion y diagnostico.
export default function TicketDetalle() {
    const { id } = useParams();
    const { sesion } = useAuth();
    const { token } = sesion;

    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let vigente = true;

        obtenerDetalle(token, id)
            .then((datos) => {
                if (!vigente) return;
                setDetalle(datos);
                setError("");
            })
            .catch((err) => {
                if (vigente) setError(err.message);
            });

        return () => {
            vigente = false;
        };
    }, [token, id]);

    if (error) {
        return (
            <div className="pagina">
                <Link to="/tickets" className="detalle-volver">← Volver a tickets</Link>
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    if (!detalle) {
        return (
            <div className="pagina">
                <p>Cargando ticket...</p>
            </div>
        );
    }

    const { ticket, diagnostico } = detalle;

    return (
        <div className="pagina detalle-pagina">
            <Link to="/tickets" className="detalle-volver">← Volver a tickets</Link>

            <div className="pagina-cabecera detalle-cabecera">
                <span className="detalle-codigo">{codigoTicket(ticket.id_ticket)}</span>
                <h1>{ticket.titulo}</h1>
                <div className="detalle-insignias">
                    <Insignia tipo="estado" valor={ticket.estado} />
                    <Insignia tipo="prioridad" valor={ticket.prioridad} />
                    <Insignia tipo="categoria" valor={ticket.categoria} />
                </div>
            </div>

            <div className="detalle-columnas">
                <div className="detalle-principal">
                    <div className="tarjeta">
                        <h2>Descripción del problema</h2>
                        <p className="detalle-texto">{ticket.descripcion}</p>
                    </div>

                    <div className="tarjeta">
                        <h2>Diagnóstico</h2>
                        {diagnostico ? (
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
                            <p className="detalle-vacio">Todavía no tiene diagnóstico.</p>
                        )}
                    </div>
                </div>

                <aside className="detalle-lateral">
                    <div className="tarjeta">
                        <h2>Resumen</h2>
                        <dl className="detalle-datos">
                            <Dato etiqueta="Apertura">{formatearFechaHora(ticket.fecha_apertura)}</Dato>
                            {ticket.fecha_resolucion && (
                                <Dato etiqueta="Resolución">
                                    {formatearFecha(ticket.fecha_resolucion)}
                                    {ticket.resuelto_sin_costo === 1 && " · sin costo"}
                                </Dato>
                            )}
                            {ticket.fecha_cierre && <Dato etiqueta="Cierre">{formatearFecha(ticket.fecha_cierre)}</Dato>}
                            <Dato etiqueta="Técnico asignado">{ticket.tecnico ?? "Sin asignar"}</Dato>
                            <Dato etiqueta="Cliente">{ticket.cliente}</Dato>
                        </dl>
                    </div>

                    <div className="tarjeta">
                        <h2>Equipo</h2>
                        <dl className="detalle-datos">
                            <Dato etiqueta="Tipo">{ticket.equipo_tipo}</Dato>
                            <Dato etiqueta="Marca y modelo">
                                {ticket.equipo_marca} {ticket.equipo_modelo}
                            </Dato>
                            <Dato etiqueta="Número de serie">{ticket.equipo_numero_serie}</Dato>
                        </dl>
                    </div>
                </aside>
            </div>
        </div>
    );
}
