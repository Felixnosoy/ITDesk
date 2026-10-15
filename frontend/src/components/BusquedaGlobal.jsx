import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { listarTickets } from "../api/tickets";
import { codigoTicket, nombreEquipo, normalizar } from "../utils/formato";
import Insignia from "./Insignia";
import Icono from "./Iconos";
import "./BusquedaGlobal.css";

const MAXIMO_TICKETS = 8;
const MAXIMO_CLIENTES = 5;

// Un codigo escrito igual al del ticket va primero; despues los que lo
// contienen en el codigo y al final los que coinciden en otro dato.
const relevancia = (ticket, texto) => {
    const codigo = normalizar(codigoTicket(ticket.id_ticket));
    if (codigo === texto || String(ticket.id_ticket) === texto) return 0;
    if (codigo.includes(texto)) return 1;
    return 2;
};

// Busca en los tickets que el usuario ya puede ver (el servidor decide el
// alcance), asi un cliente solo encuentra los suyos. Los clientes salen de
// esos mismos tickets: elegir uno abre el listado filtrado por su nombre.
const buscar = (tickets, consulta, incluirClientes) => {
    const texto = normalizar(consulta.trim());
    if (!texto) return { tickets: [], clientes: [] };

    const encontrados = tickets
        .filter((t) =>
            normalizar(
                `${codigoTicket(t.id_ticket)} ${t.titulo} ${t.cliente} ${nombreEquipo(t)} ${t.equipo_numero_serie}`
            ).includes(texto)
        )
        .sort((a, b) => relevancia(a, texto) - relevancia(b, texto))
        .slice(0, MAXIMO_TICKETS);

    const clientes = new Map();
    if (incluirClientes) {
        for (const t of tickets) {
            if (normalizar(t.cliente).includes(texto)) {
                clientes.set(t.cliente, (clientes.get(t.cliente) ?? 0) + 1);
            }
        }
    }

    return {
        tickets: encontrados,
        clientes: [...clientes].slice(0, MAXIMO_CLIENTES).map(([nombre, cantidad]) => ({ nombre, cantidad })),
    };
};

// Busqueda global (issue HU30.4). Se abre con Ctrl+K desde cualquier
// pantalla y se usa sin raton: flechas para moverse, Enter abre el
// resultado marcado (el primero si no se movio) y Escape cierra. El foco
// queda siempre en el campo; los resultados se anuncian con
// aria-activedescendant, como en un combobox.
export default function BusquedaGlobal({ onCerrar }) {
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const navigate = useNavigate();
    const campo = useRef(null);

    const [tickets, setTickets] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [consulta, setConsulta] = useState("");
    const [activo, setActivo] = useState(0);

    // se pide al abrir y no antes, asi siempre busca sobre datos al dia
    useEffect(() => {
        let vigente = true;

        listarTickets(token)
            .then((datos) => {
                if (vigente) setTickets(datos);
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
    }, [token]);

    // al cerrar, el foco vuelve a donde estaba (el boton o la pantalla)
    useEffect(() => {
        const anterior = document.activeElement;
        campo.current?.focus();
        return () => anterior?.focus?.();
    }, []);

    const resultados = useMemo(
        () => buscar(tickets, consulta, usuario.rol !== ROLES.CLIENTE),
        [tickets, consulta, usuario.rol]
    );

    // una sola lista para el teclado, en el mismo orden en que se ven
    const opciones = useMemo(
        () => [
            ...resultados.tickets.map((t) => ({ id: `busqueda-ticket-${t.id_ticket}`, ruta: `/tickets/${t.id_ticket}` })),
            ...resultados.clientes.map((c, i) => ({
                id: `busqueda-cliente-${i}`,
                ruta: `/tickets?busqueda=${encodeURIComponent(c.nombre)}`,
            })),
        ],
        [resultados]
    );

    const indiceActivo = Math.min(activo, Math.max(opciones.length - 1, 0));
    const idActivo = opciones[indiceActivo]?.id;

    const elegir = (indice) => {
        const opcion = opciones[indice];
        if (!opcion) return;
        onCerrar();
        navigate(opcion.ruta);
    };

    const alPresionar = (evento) => {
        if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
            evento.preventDefault();
            if (opciones.length === 0) return;
            const paso = evento.key === "ArrowDown" ? 1 : -1;
            setActivo((indiceActivo + paso + opciones.length) % opciones.length);
        } else if (evento.key === "Enter") {
            evento.preventDefault();
            elegir(indiceActivo);
        } else if (evento.key === "Escape") {
            evento.preventDefault();
            onCerrar();
        } else if (evento.key === "Tab") {
            // el campo es lo unico que recibe foco: Tab no saca del dialogo
            evento.preventDefault();
        }
    };

    // el elemento marcado con las flechas siempre queda a la vista
    useEffect(() => {
        if (idActivo) document.getElementById(idActivo)?.scrollIntoView({ block: "nearest" });
    }, [idActivo]);

    const hayConsulta = consulta.trim() !== "";
    const sinResultados = hayConsulta && !cargando && opciones.length === 0;
    let mensaje = "";
    if (error) mensaje = error;
    else if (!hayConsulta) mensaje = "Escribe un código (TK-0004), un cliente o un equipo.";
    else if (cargando) mensaje = "Buscando...";
    else if (sinResultados) mensaje = `Nada coincide con "${consulta.trim()}".`;

    const opcionProps = (opcion, indice) => ({
        id: opcion.id,
        role: "option",
        "aria-selected": indice === indiceActivo,
        className: `busqueda-opcion${indice === indiceActivo ? " activa" : ""}`,
        onMouseMove: () => setActivo(indice),
        // mousedown y no click, para que el campo no pierda el foco antes
        onMouseDown: (evento) => {
            evento.preventDefault();
            elegir(indice);
        },
    });

    return (
        <div
            className="busqueda-fondo"
            onMouseDown={(evento) => {
                if (evento.target === evento.currentTarget) onCerrar();
            }}
        >
            <div className="busqueda" role="dialog" aria-modal="true" aria-label="Búsqueda global">
                <div className="busqueda-campo">
                    <Icono nombre="buscar" />
                    <input
                        ref={campo}
                        type="text"
                        role="combobox"
                        aria-expanded={opciones.length > 0}
                        aria-controls="busqueda-resultados"
                        aria-activedescendant={idActivo}
                        aria-autocomplete="list"
                        aria-label="Buscar tickets y clientes"
                        placeholder={usuario.rol === ROLES.CLIENTE ? "Buscar en mis tickets" : "Buscar tickets y clientes"}
                        autoComplete="off"
                        spellCheck="false"
                        value={consulta}
                        onChange={(e) => {
                            setConsulta(e.target.value);
                            setActivo(0);
                        }}
                        onKeyDown={alPresionar}
                    />
                    <kbd className="busqueda-tecla">Esc</kbd>
                </div>

                <ul id="busqueda-resultados" role="listbox" aria-label="Resultados" className="busqueda-resultados">
                    {resultados.tickets.length > 0 && (
                        <li role="presentation" className="busqueda-grupo">
                            Tickets
                        </li>
                    )}
                    {resultados.tickets.map((t, i) => (
                        <li key={t.id_ticket} {...opcionProps(opciones[i], i)}>
                            <span className="etiqueta-codigo">{codigoTicket(t.id_ticket)}</span>
                            <span className="busqueda-opcion-texto">
                                <strong>{t.titulo}</strong>
                                <span>
                                    {usuario.rol === ROLES.CLIENTE ? nombreEquipo(t) : `${t.cliente} · ${nombreEquipo(t)}`}
                                </span>
                            </span>
                            <Insignia tipo="estado" valor={t.estado} />
                        </li>
                    ))}

                    {resultados.clientes.length > 0 && (
                        <li role="presentation" className="busqueda-grupo">
                            Clientes
                        </li>
                    )}
                    {resultados.clientes.map((c, i) => {
                        const indice = resultados.tickets.length + i;
                        return (
                            <li key={c.nombre} {...opcionProps(opciones[indice], indice)}>
                                <span className="busqueda-avatar" aria-hidden="true">
                                    <Icono nombre="perfil" tamano={16} />
                                </span>
                                <span className="busqueda-opcion-texto">
                                    <strong>{c.nombre}</strong>
                                    <span>
                                        {c.cantidad} {c.cantidad === 1 ? "ticket" : "tickets"}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ul>

                {mensaje && (
                    <p className="busqueda-mensaje" role="status">
                        {mensaje}
                    </p>
                )}

                <div className="busqueda-pie" aria-hidden="true">
                    <span>
                        <kbd className="busqueda-tecla">↑</kbd> <kbd className="busqueda-tecla">↓</kbd> moverse
                    </span>
                    <span>
                        <kbd className="busqueda-tecla">Enter</kbd> abrir
                    </span>
                    <span>
                        <kbd className="busqueda-tecla">Esc</kbd> cerrar
                    </span>
                </div>
            </div>
        </div>
    );
}
