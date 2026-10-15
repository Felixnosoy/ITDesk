import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import {
    ESTADOS_TICKET,
    PRIORIDADES,
    FILTROS_VACIOS,
    ETIQUETA_PRIORIDAD,
    CLASE_PRIORIDAD,
    VISTA_TODOS,
    vistasParaRol,
} from "../constants/tickets";
import { listarTickets } from "../api/tickets";
import { siguienteOrden, ordenarFilas, totalPaginas, paginar } from "../utils/tabla";
import { codigoTicket, formatearFecha, nombreEquipo, normalizar } from "../utils/formato";
import FiltrosTickets from "../components/FiltrosTickets";
import VistasRapidas from "../components/VistasRapidas";
import TablaOrdenable from "../components/TablaOrdenable";
import TableroTickets from "../components/TableroTickets";
import Paginacion from "../components/Paginacion";
import Insignia from "../components/Insignia";
import Icono from "../components/Iconos";
import "./Tickets.css";

// orden por etapa del ciclo de vida y por gravedad, no alfabetico
const ORDEN_ESTADO = Object.values(ESTADOS_TICKET);
const ORDEN_PRIORIDAD = Object.values(PRIORIDADES);

const ROLES_QUE_REGISTRAN = [ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR];

const MODOS = [
    { clave: "lista", etiqueta: "Lista", icono: "lista" },
    { clave: "tablero", etiqueta: "Tablero", icono: "tablero" },
];

// Texto largo en una sola linea, cortado con puntos suspensivos; el texto
// completo queda en el title para verlo al pasar el raton (issue HU30.2).
const recorte = (texto, clase = "") => (
    <span className={`tickets-recorte ${clase}`} title={texto}>
        {texto}
    </span>
);

const enlace = (ticket, contenido) => <Link to={`/tickets/${ticket.id_ticket}`}>{contenido}</Link>;

const marcaYModelo = (ticket) => [ticket.equipo_marca, ticket.equipo_modelo].filter(Boolean).join(" ");

// Listado de tickets. El alcance lo decide el servidor (el cliente recibe
// solo los suyos); estado, prioridad y categoria tambien se filtran alla.
// La busqueda por texto, las vistas rapidas, el orden y la paginacion se
// hacen aqui. La vista y el modo (lista o tablero) van en la direccion para
// que se puedan compartir y sobrevivan a volver atras desde un ticket.
export default function Tickets() {
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const esCliente = usuario.rol === ROLES.CLIENTE;
    const vistas = useMemo(() => vistasParaRol(usuario.rol), [usuario.rol]);

    const [parametros, setParametros] = useSearchParams();
    const vista = vistas.some((v) => v.clave === parametros.get("vista")) ? parametros.get("vista") : VISTA_TODOS;
    const modo = !esCliente && parametros.get("modo") === "tablero" ? "tablero" : "lista";
    // la busqueda global (Ctrl+K) llega con ?busqueda= al elegir un cliente
    const busquedaRecibida = parametros.get("busqueda");

    const [tickets, setTickets] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [filtros, setFiltros] = useState(() => ({ ...FILTROS_VACIOS, busqueda: busquedaRecibida ?? "" }));
    const [orden, setOrden] = useState({ columna: "fecha_apertura", direccion: "desc" });
    const [pagina, setPagina] = useState(1);

    const { estado, prioridad, categoria, busqueda } = filtros;

    const cambiarParametro = (nombre, valor, porDefecto) => {
        setParametros(
            (actuales) => {
                const nuevos = new URLSearchParams(actuales);
                if (valor === porDefecto) nuevos.delete(nombre);
                else nuevos.set(nombre, valor);
                return nuevos;
            },
            { replace: true }
        );
    };

    // La busqueda recibida se pasa al campo (durante el render, para no
    // pintar un momento el listado sin filtrar) y despues se quita de la
    // direccion: si quedara ahi, elegir otra vez el mismo cliente no
    // cambiaria nada.
    if (busquedaRecibida !== null && filtros.busqueda !== busquedaRecibida) {
        if (estado || prioridad || categoria) setCargando(true);
        setFiltros({ ...FILTROS_VACIOS, busqueda: busquedaRecibida });
        setPagina(1);
    }

    useEffect(() => {
        if (busquedaRecibida === null) return;

        setParametros(
            (actuales) => {
                const nuevos = new URLSearchParams(actuales);
                nuevos.delete("busqueda");
                return nuevos;
            },
            { replace: true }
        );
    }, [busquedaRecibida, setParametros]);

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
            {
                clave: "id_ticket",
                titulo: "Código",
                render: (t) => (
                    <>
                        {enlace(t, <span className="etiqueta-codigo">{codigoTicket(t.id_ticket)}</span>)}
                        <span className="solo-lector">Prioridad {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}</span>
                    </>
                ),
            },
            { clave: "titulo", titulo: "Título", render: (t) => enlace(t, recorte(t.titulo, "tickets-recorte-titulo")) },
            ...(esCliente ? [] : [{ clave: "cliente", titulo: "Cliente", render: (t) => recorte(t.cliente) }]),
            {
                clave: "equipo",
                titulo: "Equipo",
                // el tipo queda en el title en vez de en una segunda linea
                render: (t) => (
                    <span className="tickets-recorte" title={nombreEquipo(t)}>
                        {marcaYModelo(t)}
                    </span>
                ),
                valorOrden: nombreEquipo,
            },
            { clave: "tecnico", titulo: "Técnico", render: (t) => recorte(t.tecnico ?? "Sin técnico") },
            {
                clave: "estado",
                titulo: "Estado",
                render: (t) => <Insignia tipo="estado" valor={t.estado} />,
                valorOrden: (t) => ORDEN_ESTADO.indexOf(t.estado),
            },
            {
                clave: "prioridad",
                titulo: "Prioridad",
                // el color ya lo da la franja de la fila; aqui basta el texto
                render: (t) => <span className="tickets-prioridad">{ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}</span>,
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

    // la busqueda por texto se aplica antes que la vista, asi la cantidad de
    // cada vista responde a lo que se escribio
    const buscados = useMemo(() => {
        const texto = normalizar(busqueda.trim());
        if (!texto) return tickets;

        return tickets.filter((t) =>
            normalizar(
                `${codigoTicket(t.id_ticket)} ${t.titulo} ${t.cliente} ${nombreEquipo(t)} ${t.equipo_numero_serie}`
            ).includes(texto)
        );
    }, [tickets, busqueda]);

    const cantidades = useMemo(
        () =>
            Object.fromEntries(
                vistas.map((v) => [v.clave, buscados.filter((t) => v.incluye(t, usuario)).length])
            ),
        [vistas, buscados, usuario]
    );

    const visibles = useMemo(() => {
        const vistaActual = vistas.find((v) => v.clave === vista);
        const enVista = vistaActual ? buscados.filter((t) => vistaActual.incluye(t, usuario)) : buscados;

        return ordenarFilas(enVista, columnas, orden);
    }, [vistas, vista, buscados, usuario, columnas, orden]);

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

    const cambiarVista = (clave) => {
        cambiarParametro("vista", clave, VISTA_TODOS);
        setPagina(1);
    };

    const ordenarPor = (columna) => {
        setOrden((actual) => siguienteOrden(actual, columna));
        setPagina(1);
    };

    const sinFiltros = !estado && !prioridad && !categoria && !busqueda.trim();
    let textoVacio = "Ningún ticket coincide con los filtros.";
    if (tickets.length === 0 && sinFiltros) textoVacio = "Todavía no hay tickets.";
    else if (vista !== VISTA_TODOS && sinFiltros) textoVacio = "No hay tickets en esta vista.";

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

            {vistas.length > 0 && (
                <div className="tickets-barra no-imprimir">
                    <VistasRapidas vistas={vistas} cantidades={cantidades} activa={vista} onCambiar={cambiarVista} />

                    <div className="tickets-modo" role="group" aria-label="Forma de ver los tickets">
                        {MODOS.map((m) => (
                            <button
                                key={m.clave}
                                type="button"
                                className="tickets-modo-boton"
                                aria-pressed={modo === m.clave}
                                onClick={() => cambiarParametro("modo", m.clave, "lista")}
                            >
                                <Icono nombre={m.icono} tamano={16} />
                                {m.etiqueta}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="tarjeta tickets-filtros no-imprimir">
                <FiltrosTickets valores={filtros} onCambiar={cambiarFiltros} />
            </div>

            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}

            {!error && modo === "tablero" && (
                <>
                    <p className="tickets-contador-suelto" aria-live="polite">
                        {cargando ? "Cargando tickets..." : `${visibles.length} ${visibles.length === 1 ? "ticket" : "tickets"}`}
                    </p>
                    {!cargando && <TableroTickets tickets={visibles} mostrarCliente={!esCliente} />}
                </>
            )}

            {!error && modo === "lista" && (
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
                                claseFila={(t) => CLASE_PRIORIDAD[t.prioridad]}
                                orden={orden}
                                onOrdenar={ordenarPor}
                                textoVacio={textoVacio}
                            />
                            <Paginacion pagina={paginaActual} totalPaginas={paginas} onCambiar={setPagina} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
