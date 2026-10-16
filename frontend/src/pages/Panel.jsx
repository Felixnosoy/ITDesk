import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET, ETIQUETA_ESTADO } from "../constants/tickets";
import { ESTADOS_FACTURA } from "../constants/cotizaciones";
import { PANELES } from "../constants/navegacion";
import { listarTickets } from "../api/tickets";
import { codigoTicket, formatearMonto } from "../utils/formato";
import { PASOS_CICLO, proximoPaso, leToca } from "../utils/ciclo";
import Insignia from "../components/Insignia";
import ProgresoCiclo from "../components/ProgresoCiclo";
import "./Panel.css";

const ROLES_QUE_REGISTRAN = [ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR];
const ORDEN_PRIORIDAD = { Alta: 0, Media: 1, Baja: 2 };

const activo = (t) => t.estado !== ESTADOS_TICKET.CERRADO;
const facturaPendiente = (t) => t.factura_estado === ESTADOS_FACTURA.PENDIENTE;
const sumar = (tickets) => tickets.reduce((suma, t) => suma + Number(t.factura_total || 0), 0);
const esDeHoy = (fecha) => new Date(fecha).toDateString() === new Date().toDateString();

// Indicadores de cada rol: solo cifras que esa persona usa para decidir que
// hacer, calculadas sobre el mismo listado que ve en Tickets.
function indicadores(rol, tickets, idUsuario) {
    const activos = tickets.filter(activo);
    const contar = (...estados) => activos.filter((t) => estados.includes(t.estado)).length;

    if (rol === ROLES.TECNICO) {
        return [
            { etiqueta: "Asignados a ti", valor: activos.filter((t) => t.id_tecnico === idUsuario).length },
            { etiqueta: "Por diagnosticar", valor: contar(ESTADOS_TICKET.ABIERTO, ESTADOS_TICKET.EN_DIAGNOSTICO) },
            { etiqueta: "Esperando al cliente", valor: contar(ESTADOS_TICKET.ESPERANDO_APROBACION) },
            { etiqueta: "En reparación", valor: contar(ESTADOS_TICKET.EN_REPARACION) },
        ];
    }
    if (rol === ROLES.RECEPCIONISTA) {
        return [
            { etiqueta: "Recibidos hoy", valor: tickets.filter((t) => esDeHoy(t.fecha_apertura)).length },
            { etiqueta: "Equipos en el taller", valor: activos.length },
            { etiqueta: "Listos para entregar", valor: contar(ESTADOS_TICKET.RESUELTO) },
            { etiqueta: "Facturas por cobrar", valor: tickets.filter(facturaPendiente).length },
        ];
    }
    return [
        { etiqueta: "Tickets activos", valor: activos.length },
        { etiqueta: "Esperando al cliente", valor: contar(ESTADOS_TICKET.ESPERANDO_APROBACION) },
        { etiqueta: "Por cobrar", valor: formatearMonto(sumar(tickets.filter(facturaPendiente))), monto: true },
        {
            etiqueta: "Cobrado",
            valor: formatearMonto(sumar(tickets.filter((t) => t.factura_estado === ESTADOS_FACTURA.PAGADA))),
            monto: true,
        },
    ];
}

// Una fila de la lista "Te toca": codigo, titulo, equipo y el paso pendiente
function FilaTicket({ ticket, paso, esCliente }) {
    return (
        <li>
            <Link to={`/tickets/${ticket.id_ticket}`} className={`panel-fila panel-fila-${ticket.prioridad?.toLowerCase()}`}>
                <span className="etiqueta-codigo">{codigoTicket(ticket.id_ticket)}</span>
                <span className="panel-fila-texto">
                    <strong>{ticket.titulo}</strong>
                    <span>
                        {ticket.equipo_marca} {ticket.equipo_modelo}
                        {!esCliente && ` · ${ticket.cliente}`}
                    </span>
                </span>
                <span className="panel-fila-paso">{paso.texto}</span>
                <Insignia tipo="estado" valor={ticket.estado} />
            </Link>
        </li>
    );
}

// Tarjeta de un equipo del cliente con su avance en el ciclo
function TarjetaEquipo({ ticket, paso, urgente }) {
    return (
        <Link to={`/tickets/${ticket.id_ticket}`} className={`tarjeta panel-equipo${urgente ? " panel-equipo-urgente" : ""}`}>
            <div className="panel-equipo-cabecera">
                <span className="etiqueta-codigo">{codigoTicket(ticket.id_ticket)}</span>
                <Insignia tipo="estado" valor={ticket.estado} />
            </div>
            <strong className="panel-equipo-nombre">
                {ticket.equipo_marca} {ticket.equipo_modelo}
            </strong>
            <span className="panel-equipo-titulo">{ticket.titulo}</span>
            <ProgresoCiclo estado={ticket.estado} compacta />
            <p className="panel-equipo-paso">{paso.texto}</p>
            {urgente && <span className="panel-equipo-accion">Revisar ahora →</span>}
        </Link>
    );
}

// Reparto de los tickets activos por etapa, para el administrador
function Distribucion({ tickets }) {
    const activos = tickets.filter(activo);
    // el indice da el color del tramo, el mismo de la insignia de cada estado
    const etapas = PASOS_CICLO.map((p, indice) => ({
        ...p,
        indice,
        cantidad: activos.filter((t) => t.estado === p.estado).length,
    })).filter((p) => p.estado !== ESTADOS_TICKET.CERRADO);

    if (activos.length === 0) return <p className="panel-vacio">No hay tickets activos.</p>;

    return (
        <>
            <div className="panel-barra" role="img" aria-label={etapas.map((e) => `${e.etiqueta}: ${e.cantidad}`).join(", ")}>
                {etapas.filter((e) => e.cantidad > 0).map((e) => (
                    <span key={e.estado} className={`panel-barra-tramo tramo-${e.indice}`} style={{ flexGrow: e.cantidad }} />
                ))}
            </div>
            <ul className="panel-leyenda">
                {etapas.map((e) => (
                    <li key={e.estado}>
                        <span className={`panel-punto tramo-${e.indice}`} aria-hidden="true" />
                        {ETIQUETA_ESTADO[e.estado]} <strong>{e.cantidad}</strong>
                    </li>
                ))}
            </ul>
        </>
    );
}

// Inicio de cada rol: lo que le toca hacer ahora y las cifras de su trabajo.
// El cliente ve sus equipos con el avance; el personal, una cola ordenada
// por lo que espera de el.
export default function Panel() {
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const { rol } = usuario;
    const esCliente = rol === ROLES.CLIENTE;

    const [tickets, setTickets] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let vigente = true;
        listarTickets(token)
            .then((datos) => vigente && setTickets(datos))
            .catch((err) => vigente && setError(err.message));
        return () => {
            vigente = false;
        };
    }, [token]);

    const conPaso = (tickets ?? []).map((ticket) => ({ ticket, paso: proximoPaso(ticket, rol) }));
    const pendientes = conPaso
        .filter(({ paso }) => leToca(paso, rol))
        // primero lo asignado a quien mira y lo mas urgente
        .sort(
            (a, b) =>
                (b.ticket.id_tecnico === usuario.id_usuario) - (a.ticket.id_tecnico === usuario.id_usuario) ||
                (ORDEN_PRIORIDAD[a.ticket.prioridad] ?? 3) - (ORDEN_PRIORIDAD[b.ticket.prioridad] ?? 3)
        );
    const cerrados = conPaso.filter(({ ticket }) => !activo(ticket));

    return (
        <div className="pagina panel">
            <div className="pagina-cabecera panel-cabecera">
                <div>
                    <h1>Hola, {usuario.nombre}</h1>
                    <p>{PANELES[rol]?.resumen}</p>
                </div>
                {ROLES_QUE_REGISTRAN.includes(rol) && (
                    <Link to="/tickets/nuevo" className="boton">
                        + Registrar ticket
                    </Link>
                )}
            </div>

            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}

            {!tickets && !error && <p className="panel-vacio">Cargando...</p>}

            {tickets && !esCliente && (
                <div className="panel-indicadores">
                    {indicadores(rol, tickets, usuario.id_usuario).map((dato) => (
                        <div key={dato.etiqueta} className="tarjeta panel-indicador">
                            <span>{dato.etiqueta}</span>
                            <strong className={`cifra${dato.monto ? " panel-cifra-monto" : ""}`}>{dato.valor}</strong>
                        </div>
                    ))}
                </div>
            )}

            {tickets && esCliente && (
                <>
                    {pendientes.length > 0 && (
                        <div className="aviso panel-aviso" role="status">
                            {pendientes.length === 1
                                ? "Tienes 1 equipo esperando tu respuesta."
                                : `Tienes ${pendientes.length} equipos esperando tu respuesta.`}
                        </div>
                    )}
                    <div className="panel-titulo-fila">
                        <h2>Tus equipos en el taller</h2>
                        <Link to="/tickets">Ver todos</Link>
                    </div>
                    {conPaso.filter(({ ticket }) => activo(ticket)).length === 0 ? (
                        <div className="tarjeta panel-vacio-tarjeta">
                            <strong>No tienes equipos en el taller.</strong>
                            <span>Cuando dejes un equipo en recepción, aquí verás cómo avanza su reparación.</span>
                        </div>
                    ) : (
                        <div className="panel-equipos">
                            {conPaso
                                .filter(({ ticket }) => activo(ticket))
                                .sort((a, b) => leToca(b.paso, rol) - leToca(a.paso, rol))
                                .map(({ ticket, paso }) => (
                                    <TarjetaEquipo key={ticket.id_ticket} ticket={ticket} paso={paso} urgente={leToca(paso, rol)} />
                                ))}
                        </div>
                    )}
                    {cerrados.length > 0 && (
                        <p className="panel-historial">
                            {cerrados.length} {cerrados.length === 1 ? "reparación entregada" : "reparaciones entregadas"} en tu
                            historial. <Link to="/tickets">Ver historial</Link>
                        </p>
                    )}
                </>
            )}

            {tickets && !esCliente && (
                <div className={rol === ROLES.ADMINISTRADOR ? "panel-columnas" : undefined}>
                    <section className="tarjeta panel-seccion" aria-labelledby="panel-te-toca">
                        <div className="panel-titulo-fila">
                            <h2 id="panel-te-toca">
                                {rol === ROLES.ADMINISTRADOR ? "Pendientes del taller" : "Te toca"}
                                <span className="panel-contador">{pendientes.length}</span>
                            </h2>
                            <Link to="/tickets">Ver todos los tickets</Link>
                        </div>
                        {pendientes.length === 0 ? (
                            <p className="panel-vacio">Nada pendiente por ahora. Todo al día.</p>
                        ) : (
                            <ul className="panel-lista">
                                {pendientes.slice(0, 8).map(({ ticket, paso }) => (
                                    <FilaTicket key={ticket.id_ticket} ticket={ticket} paso={paso} esCliente={esCliente} />
                                ))}
                            </ul>
                        )}
                        {pendientes.length > 8 && (
                            <p className="panel-mas">
                                Y {pendientes.length - 8} más. <Link to="/tickets">Ver en el listado</Link>
                            </p>
                        )}
                    </section>

                    {rol === ROLES.ADMINISTRADOR && (
                        <section className="tarjeta panel-seccion" aria-labelledby="panel-etapas">
                            <h2 id="panel-etapas">Tickets activos por etapa</h2>
                            <Distribucion tickets={tickets} />
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
