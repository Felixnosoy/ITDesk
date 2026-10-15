import { Link } from "react-router-dom";
import { ESTADOS_TICKET, ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, CLASE_PRIORIDAD } from "../constants/tickets";
import { codigoTicket, nombreEquipo } from "../utils/formato";
import "./TableroTickets.css";

// Una columna por cada estado del ciclo de vida, en el orden en que avanza
// el ticket, aunque alguna quede vacia: asi el tablero siempre tiene la
// misma forma y se ve de un vistazo en que etapa se acumula el trabajo.
const COLUMNAS = Object.values(ESTADOS_TICKET);

// clase del punto de color de cada estado, la misma familia que la insignia
const PUNTO_ESTADO = {
    [ESTADOS_TICKET.ABIERTO]: "abierto",
    [ESTADOS_TICKET.EN_DIAGNOSTICO]: "diagnostico",
    [ESTADOS_TICKET.ESPERANDO_APROBACION]: "espera",
    [ESTADOS_TICKET.EN_REPARACION]: "reparacion",
    [ESTADOS_TICKET.RESUELTO]: "resuelto",
    [ESTADOS_TICKET.CERRADO]: "cerrado",
};

// Tablero de tickets por estado (issue HU30.3). Recibe los tickets ya
// filtrados y ordenados por la pantalla; aqui solo se reparten en columnas.
// Cada tarjeta es un enlace, asi se abre con clic o con Tab y Enter.
export default function TableroTickets({ tickets, mostrarCliente }) {
    return (
        <div className="tablero" aria-label="Tablero de tickets por estado">
            {COLUMNAS.map((estado) => {
                const delEstado = tickets.filter((t) => t.estado === estado);
                const idTitulo = `tablero-${PUNTO_ESTADO[estado]}`;

                return (
                    <section key={estado} className="tablero-columna" aria-labelledby={idTitulo}>
                        <h2 id={idTitulo} className="tablero-titulo">
                            <span className={`tablero-punto tablero-punto-${PUNTO_ESTADO[estado]}`} aria-hidden="true" />
                            {ETIQUETA_ESTADO[estado]}
                            <span className="tablero-cantidad">{delEstado.length}</span>
                        </h2>

                        {delEstado.length === 0 ? (
                            <p className="tablero-vacio">Sin tickets</p>
                        ) : (
                            <ul className="tablero-lista">
                                {delEstado.map((ticket) => (
                                    <li key={ticket.id_ticket}>
                                        <Link
                                            to={`/tickets/${ticket.id_ticket}`}
                                            className={`tablero-tarjeta ${CLASE_PRIORIDAD[ticket.prioridad] ?? ""}`}
                                        >
                                            <span className="tablero-tarjeta-cabeza">
                                                <span className="etiqueta-codigo">{codigoTicket(ticket.id_ticket)}</span>
                                                <span className="tablero-prioridad">
                                                    {ETIQUETA_PRIORIDAD[ticket.prioridad] ?? ticket.prioridad}
                                                </span>
                                            </span>
                                            <strong className="tablero-tarjeta-titulo">{ticket.titulo}</strong>
                                            <span className="tablero-tarjeta-dato">{nombreEquipo(ticket)}</span>
                                            {mostrarCliente && (
                                                <span className="tablero-tarjeta-dato">{ticket.cliente}</span>
                                            )}
                                            <span className="tablero-tarjeta-dato">{ticket.tecnico ?? "Sin técnico"}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
