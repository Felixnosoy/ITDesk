import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, ETIQUETA_ROL } from "../constants/roles";
import { buscarGlobal } from "../api/busqueda";
import { codigoTicket } from "../utils/formato";
import Icono from "./Iconos";
import Insignia from "./Insignia";
import "./BuscadorGlobal.css";

const MINIMO = 2;
const ESPERA_MS = 250;

// Convierte la respuesta del servidor en una lista plana de opciones, cada
// una con su grupo y a donde lleva. Clientes y personal no tienen ficha
// propia: llevan al listado ya filtrado por esa persona.
function opcionesDe(resultados, texto) {
    if (!resultados) return [];

    const opciones = [
        ...resultados.tickets.map((t) => ({
            grupo: "Tickets",
            clave: `t${t.id_ticket}`,
            codigo: codigoTicket(t.id_ticket),
            titulo: t.titulo,
            detalle: `${t.equipo_marca} ${t.equipo_modelo} · ${t.cliente}`,
            estado: t.estado,
            ruta: `/tickets/${t.id_ticket}`,
        })),
        ...resultados.equipos.map((e) => ({
            grupo: "Equipos",
            clave: `e${e.id_equipo}`,
            titulo: `${e.marca} ${e.modelo}`,
            detalle: `${e.tipo} · Serie ${e.numero_serie} · ${e.cliente}`,
            ruta: e.ultimo_ticket ? `/tickets/${e.ultimo_ticket}` : `/tickets?q=${encodeURIComponent(e.numero_serie)}`,
        })),
        ...resultados.clientes.map((c) => ({
            grupo: "Clientes",
            clave: `c${c.id_usuario}`,
            titulo: `${c.nombre} ${c.apellido}`,
            detalle: [c.correo, c.telefono].filter(Boolean).join(" · "),
            ruta: `/tickets?q=${encodeURIComponent(`${c.nombre} ${c.apellido}`)}`,
        })),
        ...resultados.personal.map((p) => ({
            grupo: "Personal",
            clave: `p${p.id_usuario}`,
            titulo: `${p.nombre} ${p.apellido}`,
            detalle: `${ETIQUETA_ROL[p.rol] ?? p.rol} · ${p.correo}`,
            ruta: `/usuarios?q=${encodeURIComponent(p.correo)}`,
        })),
    ];

    // siempre se puede seguir la busqueda en el listado completo
    opciones.push({
        grupo: "",
        clave: "todos",
        titulo: `Buscar «${texto}» en todos los tickets`,
        ruta: `/tickets?q=${encodeURIComponent(texto)}`,
        pie: true,
    });

    return opciones;
}

// Buscador de la barra superior, al estilo de los sistemas de mesa de
// ayuda: un solo campo para encontrar tickets, equipos, clientes y personal.
// Es un combobox: las flechas recorren los resultados, Enter abre el
// elegido, Escape cierra. Ctrl+K (o /) lo enfoca desde cualquier pantalla.
export default function BuscadorGlobal() {
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const navegar = useNavigate();
    const id = useId();
    const campo = useRef(null);
    const contenedor = useRef(null);

    const [texto, setTexto] = useState("");
    const [resultados, setResultados] = useState(null);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState("");
    const [abierto, setAbierto] = useState(false);
    const [activa, setActiva] = useState(0);

    const consulta = texto.trim();
    const opciones = useMemo(() => opcionesDe(resultados, consulta), [resultados, consulta]);
    const sinResultados = resultados && opciones.length === 1;

    // espera a que se deje de escribir; una respuesta vieja nunca pisa a una nueva
    useEffect(() => {
        if (consulta.length < MINIMO) return undefined;

        let vigente = true;
        const temporizador = setTimeout(() => {
            setBuscando(true);
            buscarGlobal(token, consulta)
                .then((datos) => {
                    if (!vigente) return;
                    setResultados(datos);
                    setError("");
                    setActiva(0);
                })
                .catch((err) => vigente && setError(err.message))
                .finally(() => vigente && setBuscando(false));
        }, ESPERA_MS);

        return () => {
            vigente = false;
            clearTimeout(temporizador);
        };
    }, [consulta, token]);

    // atajo global: Ctrl+K o "/" fuera de un campo de texto
    useEffect(() => {
        const alPresionar = (evento) => {
            const escribiendo = evento.target.closest?.("input, textarea, select, [contenteditable=true]");
            if ((evento.key === "k" && (evento.ctrlKey || evento.metaKey)) || (evento.key === "/" && !escribiendo)) {
                evento.preventDefault();
                campo.current?.focus();
                campo.current?.select();
            }
        };
        document.addEventListener("keydown", alPresionar);
        return () => document.removeEventListener("keydown", alPresionar);
    }, []);

    // un clic fuera cierra la lista
    useEffect(() => {
        if (!abierto) return undefined;
        const alClic = (evento) => {
            if (!contenedor.current?.contains(evento.target)) setAbierto(false);
        };
        document.addEventListener("mousedown", alClic);
        return () => document.removeEventListener("mousedown", alClic);
    }, [abierto]);

    const elegir = (opcion) => {
        setAbierto(false);
        setTexto("");
        setResultados(null);
        campo.current?.blur();
        navegar(opcion.ruta);
    };

    const alTeclear = (evento) => {
        if (evento.key === "Escape") {
            setAbierto(false);
            return;
        }
        if (!opciones.length) return;

        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setAbierto(true);
            setActiva((i) => (i + 1) % opciones.length);
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setActiva((i) => (i - 1 + opciones.length) % opciones.length);
        } else if (evento.key === "Enter" && abierto) {
            evento.preventDefault();
            elegir(opciones[activa]);
        }
    };

    const mostrarLista = abierto && consulta.length >= MINIMO;
    const idLista = `${id}-lista`;
    const placeholder =
        usuario.rol === ROLES.CLIENTE
            ? "Buscar tus tickets o equipos"
            : "Buscar tickets, clientes, equipos o series";

    return (
        <div className="buscador" ref={contenedor}>
            <span className="buscador-icono" aria-hidden="true">
                <Icono nombre="buscar" tamano={18} />
            </span>
            <input
                ref={campo}
                type="search"
                className="buscador-campo"
                placeholder={placeholder}
                aria-label="Buscar en todo el sistema"
                role="combobox"
                aria-expanded={mostrarLista}
                aria-controls={idLista}
                aria-autocomplete="list"
                aria-activedescendant={mostrarLista && opciones[activa] ? `${id}-${opciones[activa].clave}` : undefined}
                autoComplete="off"
                value={texto}
                onChange={(e) => {
                    setTexto(e.target.value);
                    setAbierto(true);
                    if (e.target.value.trim().length < MINIMO) setResultados(null);
                }}
                onFocus={() => setAbierto(true)}
                onKeyDown={alTeclear}
            />
            <kbd className="buscador-atajo" aria-hidden="true">
                Ctrl K
            </kbd>

            {mostrarLista && (
                <div className="buscador-panel">
                    <p className="buscador-estado" role="status">
                        {error
                            ? error
                            : buscando && !resultados
                              ? "Buscando..."
                              : sinResultados
                                ? `Nada coincide con «${consulta}».`
                                : resultados
                                  ? `${opciones.length - 1} resultados`
                                  : ""}
                    </p>
                    <ul id={idLista} role="listbox" aria-label="Resultados de la búsqueda" className="buscador-lista">
                        {opciones.map((opcion, indice) => {
                            // el titulo del grupo va antes de su primera opcion
                            const encabezado =
                                opcion.grupo && opcion.grupo !== opciones[indice - 1]?.grupo ? opcion.grupo : null;

                            return (
                                <li key={opcion.clave} role="presentation">
                                    {encabezado && (
                                        <span className="buscador-grupo" role="presentation">
                                            {encabezado}
                                        </span>
                                    )}
                                    <div
                                        id={`${id}-${opcion.clave}`}
                                        role="option"
                                        aria-selected={indice === activa}
                                        className={`buscador-opcion${opcion.pie ? " buscador-opcion-pie" : ""}`}
                                        onMouseEnter={() => setActiva(indice)}
                                        onMouseDown={(evento) => evento.preventDefault()}
                                        onClick={() => elegir(opcion)}
                                    >
                                        {opcion.codigo && <span className="etiqueta-codigo">{opcion.codigo}</span>}
                                        <span className="buscador-opcion-texto">
                                            <strong>{opcion.titulo}</strong>
                                            {opcion.detalle && <span>{opcion.detalle}</span>}
                                        </span>
                                        {opcion.estado && <Insignia tipo="estado" valor={opcion.estado} />}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
