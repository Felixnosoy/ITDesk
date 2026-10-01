import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET, PRIORIDADES, FILTROS_VACIOS } from "../constants/tickets";
import { listarTickets } from "../api/tickets";
import { siguienteOrden, ordenarFilas, totalPaginas, paginar } from "../utils/tabla";
import { codigoTicket, formatearFecha, nombreEquipo, normalizar } from "../utils/formato";
import FiltrosTickets from "../components/FiltrosTickets";
import TablaOrdenable from "../components/TablaOrdenable";
import Paginacion from "../components/Paginacion";
import Insignia from "../components/Insignia";
import "./Tickets.css";

// orden por etapa del ciclo de vida y por gravedad, no alfabetico
const ORDEN_ESTADO = Object.values(ESTADOS_TICKET);
const ORDEN_PRIORIDAD = Object.values(PRIORIDADES);

const ROLES_QUE_REGISTRAN = [ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR];

const enlace = (ticket, texto) => <Link to={`/tickets/${ticket.id_ticket}`}>{texto}</Link>;

// marca y modelo en una linea, el tipo debajo en gris
const celdaEquipo = (ticket) => (
    <>
        {ticket.equipo_marca} {ticket.equipo_modelo}
        <span className="tickets-secundario">{ticket.equipo_tipo}</span>
    </>
);

// Listado de tickets. El alcance lo decide el servidor (el cliente recibe
// solo los suyos); estado, prioridad y categoria tambien se filtran alla.
// La busqueda por texto, el orden y la paginacion se hacen aqui.
export default function Tickets() {
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const esCliente = usuario.rol === ROLES.CLIENTE;

    const [tickets, setTickets] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [orden, setOrden] = useState({ columna: "fecha_apertura", direccion: "desc" });
    const [pagina, setPagina] = useState(1);

    const { estado, prioridad, categoria, busqueda } = filtros;

    useEffect(() => {
        let vigente = true;

        listarTickets(token, { estado, prioridad, categoria })
            .then((datos) => {
                if (!vigente) return;
                setTickets(datos);
                setError("");
            })
            .catch((err) => {
                if (vigente) setError(err.message);
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });

        return () => {
            vigente = false;
        };
    }, [token, estado, prioridad, categoria]);

    const columnas = useMemo(
        () => [
            { clave: "id_ticket", titulo: "Código", render: (t) => enlace(t, codigoTicket(t.id_ticket)) },
            { clave: "titulo", titulo: "Título", render: (t) => enlace(t, t.titulo) },
            ...(esCliente ? [] : [{ clave: "cliente", titulo: "Cliente" }]),
            { clave: "equipo", titulo: "Equipo", render: celdaEquipo, valorOrden: nombreEquipo },
            { clave: "tecnico", titulo: "Técnico" },
            {
                clave: "estado",
                titulo: "Estado",
                render: (t) => <Insignia tipo="estado" valor={t.estado} />,
                valorOrden: (t) => ORDEN_ESTADO.indexOf(t.estado),
            },
            {
                clave: "prioridad",
                titulo: "Prioridad",
                render: (t) => <Insignia tipo="prioridad" valor={t.prioridad} />,
                valorOrden: (t) => ORDEN_PRIORIDAD.indexOf(t.prioridad),
            },
            { clave: "categoria", titulo: "Categoría", render: (t) => <Insignia tipo="categoria" valor={t.categoria} /> },
            {
                clave: "fecha_apertura",
                titulo: "Apertura",
                render: (t) => formatearFecha(t.fecha_apertura),
                valorOrden: (t) => new Date(t.fecha_apertura).getTime(),
            },
        ],
        [esCliente]
    );

    const visibles = useMemo(() => {
        const texto = normalizar(busqueda.trim());
        const filtrados = texto
            ? tickets.filter((t) =>
                  normalizar(
                      `${codigoTicket(t.id_ticket)} ${t.titulo} ${t.cliente} ${nombreEquipo(t)} ${t.equipo_numero_serie}`
                  ).includes(texto)
              )
            : tickets;

        return ordenarFilas(filtrados, columnas, orden);
    }, [tickets, busqueda, columnas, orden]);

    const paginas = totalPaginas(visibles.length);
    // si un filtro deja menos paginas, se vuelve a la ultima que existe
    const paginaActual = Math.min(pagina, paginas);

    const cambiarFiltros = (nuevos) => {
        // estado, prioridad y categoria vuelven a pedir el listado al servidor
        const pideAlServidor = ["estado", "prioridad", "categoria"].some((campo) => nuevos[campo] !== filtros[campo]);
        if (pideAlServidor) setCargando(true);

        setFiltros(nuevos);
        setPagina(1);
    };

    const ordenarPor = (columna) => {
        setOrden((actual) => siguienteOrden(actual, columna));
        setPagina(1);
    };

    return (
        <div className="pagina tickets-pagina">
            <div className="pagina-cabecera tickets-cabecera">
                <div>
                    <h1>{esCliente ? "Mis tickets" : "Tickets"}</h1>
                    <p>
                        {esCliente
                            ? "El estado de cada equipo que dejaste en el taller."
                            : "Todos los casos del taller, del más reciente al más viejo."}
                    </p>
                </div>
                {ROLES_QUE_REGISTRAN.includes(usuario.rol) && (
                    <Link to="/tickets/nuevo" className="boton">
                        Registrar ticket
                    </Link>
                )}
            </div>

            <div className="tarjeta tickets-filtros">
                <FiltrosTickets valores={filtros} onCambiar={cambiarFiltros} />
            </div>

            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}

            {!error && (
                <div className="tarjeta tickets-tarjeta">
                    <p className="tickets-contador" aria-live="polite">
                        {cargando
                            ? "Cargando tickets..."
                            : `${visibles.length} ${visibles.length === 1 ? "ticket" : "tickets"}`}
                    </p>
                    {!cargando && (
                        <>
                            <TablaOrdenable
                                columnas={columnas}
                                filas={paginar(visibles, paginaActual)}
                                claveFila={(t) => t.id_ticket}
                                orden={orden}
                                onOrdenar={ordenarPor}
                                textoVacio={
                                    tickets.length === 0 && !estado && !prioridad && !categoria
                                        ? "Todavía no hay tickets."
                                        : "Ningún ticket coincide con los filtros."
                                }
                            />
                            <Paginacion pagina={paginaActual} totalPaginas={paginas} onCambiar={setPagina} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
