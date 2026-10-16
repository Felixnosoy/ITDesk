import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET, PRIORIDADES, FILTROS_VACIOS } from "../constants/tickets";
import { ESTADOS_FACTURA } from "../constants/cotizaciones";
import { listarTickets } from "../api/tickets";
import { proximoPaso, leToca } from "../utils/ciclo";
import { leerVistos, tieneNovedades } from "../utils/novedades";
import { siguienteOrden, ordenarFilas, totalPaginas, paginar } from "../utils/tabla";
import { codigoTicket, formatearFecha, nombreEquipo, normalizar } from "../utils/formato";
import FiltrosTickets from "../components/FiltrosTickets";
import TablaOrdenable from "../components/TablaOrdenable";
import Paginacion from "../components/Paginacion";
import Insignia from "../components/Insignia";
import { EsqueletoTabla } from "../components/Esqueleto";
import EstadoVacio from "../components/EstadoVacio";
import PildoraNuevo from "../components/PildoraNuevo";
import "./Tickets.css";

// orden por etapa del ciclo de vida y por gravedad, no alfabetico
const ORDEN_ESTADO = Object.values(ESTADOS_TICKET);
const ORDEN_PRIORIDAD = Object.values(PRIORIDADES);

const ROLES_QUE_REGISTRAN = [ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR];

const enlace = (ticket, texto) => <Link to={`/tickets/${ticket.id_ticket}`}>{texto}</Link>;

// Vistas rapidas sobre el listado: atajos a las preguntas de todos los dias
// ("que me toca", "que falta cobrar") sin armar filtros a mano.
function vistasDelRol(rol, idUsuario) {
    const toca = (t) => leToca(proximoPaso(t, rol), rol);

    if (rol === ROLES.CLIENTE) {
        return [
            { id: "todos", etiqueta: "Todos", filtro: () => true },
            { id: "toca", etiqueta: "Esperan tu respuesta", filtro: toca },
            { id: "taller", etiqueta: "En el taller", filtro: (t) => t.estado !== ESTADOS_TICKET.CERRADO },
            { id: "entregados", etiqueta: "Entregados", filtro: (t) => t.estado === ESTADOS_TICKET.CERRADO },
        ];
    }

    return [
        { id: "todos", etiqueta: "Todos", filtro: () => true },
        { id: "toca", etiqueta: "Te toca", filtro: toca },
        ...(rol === ROLES.TECNICO
            ? [{ id: "mios", etiqueta: "Asignados a mí", filtro: (t) => t.id_tecnico === idUsuario && t.estado !== ESTADOS_TICKET.CERRADO }]
            : []),
        { id: "cliente", etiqueta: "Esperan al cliente", filtro: (t) => t.estado === ESTADOS_TICKET.ESPERANDO_APROBACION },
        {
            id: "facturar",
            etiqueta: "Para facturar",
            filtro: (t) => t.estado === ESTADOS_TICKET.EN_REPARACION && !t.factura_estado,
        },
        { id: "cobrar", etiqueta: "Por cobrar", filtro: (t) => t.factura_estado === ESTADOS_FACTURA.PENDIENTE },
    ];
}

// marca y modelo en una linea, el tipo debajo en gris
// (en un solo span para que en la tarjeta del celular vaya junto)
const celdaEquipo = (ticket) => (
    <span>
        {ticket.equipo_marca} {ticket.equipo_modelo}
        <span className="tickets-secundario">{ticket.equipo_tipo}</span>
    </span>
);

// Listado de tickets. El alcance lo decide el servidor (el cliente recibe
// solo los suyos); estado, prioridad y categoria tambien se filtran alla.
// La busqueda por texto, el orden y la paginacion se hacen aqui.
export default function Tickets() {
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const esCliente = usuario.rol === ROLES.CLIENTE;
    const navegar = useNavigate();
    const vistas = useMemo(() => vistasDelRol(usuario.rol, usuario.id_usuario), [usuario.rol, usuario.id_usuario]);
    // se lee una vez al entrar: lo que se abra despues se marca alla
    const [vistos] = useState(() => leerVistos(usuario.id_usuario));
    // en el celular los filtros quedan detras de un boton
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

    const [tickets, setTickets] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    // ?q= llega desde el buscador global (un cliente, una serie): arranca
    // la busqueda del listado con ese texto
    const [parametros, setParametros] = useSearchParams();
    const qInicial = parametros.get("q") ?? "";

    // La vista rapida vive en la direccion (?vista=cobrar): al abrir un ticket
    // y volver atras se sigue en la misma vista, y el enlace se puede pasar a
    // otra persona. Idea tomada del PR #280. replace evita llenar el historial.
    const vista = vistas.some((v) => v.id === parametros.get("vista")) ? parametros.get("vista") : "todos";
    const setVista = (nueva) =>
        setParametros(
            (actuales) => {
                const siguientes = new URLSearchParams(actuales);
                if (nueva === "todos") siguientes.delete("vista");
                else siguientes.set("vista", nueva);
                return siguientes;
            },
            { replace: true }
        );
    const [filtros, setFiltros] = useState(() => ({ ...FILTROS_VACIOS, busqueda: qInicial }));
    const [qAplicada, setQAplicada] = useState(qInicial);
    // si ya estaba en el listado y llega otra busqueda, se aplica la nueva
    if (qInicial !== qAplicada) {
        setQAplicada(qInicial);
        setFiltros({ ...FILTROS_VACIOS, busqueda: qInicial });
    }
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
            { clave: "id_ticket", titulo: "Código", render: (t) => enlace(t, <span className="etiqueta-codigo">{codigoTicket(t.id_ticket)}</span>) },
            {
                clave: "titulo",
                titulo: "Ticket",
                clase: "celda-principal",
                // el cliente va debajo del titulo: una columna menos y filas mas bajas
                render: (t) => (
                    <>
                        {enlace(t, t.titulo)}
                        {tieneNovedades(t, vistos) && <PildoraNuevo />}
                        {!esCliente && <span className="tickets-secundario">{t.cliente}</span>}
                    </>
                ),
            },
            { clave: "equipo", titulo: "Equipo", render: celdaEquipo, valorOrden: nombreEquipo },
            { clave: "tecnico", titulo: "Técnico", clase: "solo-escritorio columna-amplia", render: (t) => t.tecnico ?? "Sin asignar" },
            {
                clave: "estado",
                titulo: "Estado",
                render: (t) => <Insignia tipo="estado" valor={t.estado} />,
                valorOrden: (t) => ORDEN_ESTADO.indexOf(t.estado),
            },
            // la prioridad es interna del taller: el cliente no la ve
            ...(esCliente
                ? []
                : [
                      {
                          clave: "prioridad",
                          titulo: "Prioridad",
                          clase: "solo-escritorio columna-media",
                          render: (t) => <Insignia tipo="prioridad" valor={t.prioridad} />,
                          valorOrden: (t) => ORDEN_PRIORIDAD.indexOf(t.prioridad),
                      },
                  ]),
            {
                clave: "categoria",
                titulo: "Categoría",
                clase: "solo-escritorio columna-amplia",
                render: (t) => <Insignia tipo="categoria" valor={t.categoria} />,
            },
            {
                clave: "fecha_apertura",
                titulo: "Apertura",
                clase: "columna-media",
                render: (t) => formatearFecha(t.fecha_apertura),
                valorOrden: (t) => new Date(t.fecha_apertura).getTime(),
            },
        ],
        [esCliente, vistos]
    );

    const visibles = useMemo(() => {
        const texto = normalizar(busqueda.trim());
        const deLaVista = tickets.filter(vistas.find((v) => v.id === vista)?.filtro ?? (() => true));
        const filtrados = texto
            ? deLaVista.filter((t) =>
                  normalizar(
                      `${codigoTicket(t.id_ticket)} ${t.titulo} ${t.cliente} ${nombreEquipo(t)} ${t.equipo_numero_serie}`
                  ).includes(texto)
              )
            : deLaVista;

        return ordenarFilas(filtrados, columnas, orden);
    }, [tickets, busqueda, columnas, orden, vistas, vista]);

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

    const hayFiltros = Boolean(estado || prioridad || categoria || busqueda.trim());
    const limpiar = () => {
        cambiarFiltros(FILTROS_VACIOS);
        setVista("todos");
    };

    // Tres razones distintas para una tabla vacia, cada una con su salida:
    // no hay tickets todavia, la vista "te toca" esta al dia, o los filtros
    // no encuentran nada
    let vacio;
    if (tickets.length === 0 && !hayFiltros) {
        vacio = esCliente ? (
            <EstadoVacio
                titulo="Todavía no tienes equipos en el taller"
                texto="Cuando dejes un equipo en recepción, aquí verás cómo avanza su reparación."
            />
        ) : (
            <EstadoVacio
                titulo="Todavía no hay tickets"
                texto="Los tickets aparecen aquí cuando recepción registra un equipo."
                accion={ROLES_QUE_REGISTRAN.includes(usuario.rol) ? { etiqueta: "Registrar ticket", ruta: "/tickets/nuevo" } : undefined}
            />
        );
    } else if (!hayFiltros && vista === "toca") {
        vacio = (
            <EstadoVacio
                icono="listo"
                titulo="Todo al día"
                texto={esCliente ? "Ningún equipo espera tu respuesta." : "No hay tickets esperando una acción tuya."}
            />
        );
    } else {
        vacio = (
            <EstadoVacio
                icono="buscar"
                titulo="Ningún ticket coincide"
                texto={busqueda.trim() ? `No hay resultados para "${busqueda.trim()}" con esta vista y filtros.` : "Prueba con otra vista o quita algún filtro."}
                accion={{ etiqueta: "Ver todos los tickets", onClick: limpiar }}
            />
        );
    }

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

            <div className="tickets-vistas no-imprimir" role="group" aria-label="Vistas rápidas">
                {vistas.map((v) => (
                    <button
                        key={v.id}
                        type="button"
                        className={`tickets-vista${vista === v.id ? " activa" : ""}`}
                        aria-pressed={vista === v.id}
                        onClick={() => {
                            setVista(v.id);
                            setPagina(1);
                        }}
                    >
                        {v.etiqueta}
                        {!cargando && <span className="tickets-vista-cantidad">{tickets.filter(v.filtro).length}</span>}
                    </button>
                ))}
            </div>

            <div className={`tarjeta tickets-filtros no-imprimir${filtrosAbiertos ? " abiertos" : ""}`}>
                <button
                    type="button"
                    className="boton boton-secundario boton-chico tickets-mostrar-filtros"
                    aria-expanded={filtrosAbiertos}
                    onClick={() => setFiltrosAbiertos((abierto) => !abierto)}
                >
                    {filtrosAbiertos ? "Ocultar filtros" : "Más filtros"}
                </button>
                <FiltrosTickets valores={filtros} onCambiar={cambiarFiltros} esCliente={esCliente} />
            </div>

            {error && (
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            )}

            {!error && (
                <div className="tarjeta tickets-tarjeta">
                    {!cargando && (
                        <p className="tickets-contador" aria-live="polite">
                            {visibles.length} {visibles.length === 1 ? "ticket" : "tickets"}
                        </p>
                    )}
                    {cargando && <EsqueletoTabla columnas={esCliente ? 5 : 7} etiqueta="Cargando los tickets" />}
                    {!cargando && (
                        <>
                            <TablaOrdenable
                                columnas={columnas}
                                filas={paginar(visibles, paginaActual)}
                                claveFila={(t) => t.id_ticket}
                                onFila={(t) => navegar(`/tickets/${t.id_ticket}`)}
                                claseFila={esCliente ? undefined : (t) => `tickets-fila-${t.prioridad?.toLowerCase()}`}
                                tarjetas
                                orden={orden}
                                onOrdenar={ordenarPor}
                                textoVacio={vacio}
                            />
                            <Paginacion pagina={paginaActual} totalPaginas={paginas} onCambiar={setPagina} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
