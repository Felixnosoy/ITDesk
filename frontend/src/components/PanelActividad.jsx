import { useEffect, useRef, useState } from "react";
import { ETIQUETA_ROL } from "../constants/roles";
import { formatearFechaHora, iniciales } from "../utils/formato";
import Insignia from "./Insignia";
import Adjuntos from "./Adjuntos";
import FormularioSeguimiento from "./FormularioSeguimiento";
import "./PanelActividad.css";

// Un mensaje del registro: quien, con que rol y cuando, como en el chat de
// un sistema de mesa de ayuda. Los cambios de estado no son mensajes de una
// persona sino eventos del ticket: van centrados y sin globo.
function Mensaje({ item, propio }) {
    if (item.tipo === "Estado") {
        return (
            <li className="actividad-evento">
                <span>
                    <strong>{item.usuario}</strong> cambió el estado a <Insignia tipo="estado" valor={item.estado} />
                </span>
                {item.observaciones && <p>{item.observaciones}</p>}
                <time dateTime={item.fecha}>{formatearFechaHora(item.fecha)}</time>
            </li>
        );
    }

    return (
        <li className={`actividad-mensaje${propio ? " propio" : ""}`}>
            <span className="actividad-avatar" aria-hidden="true">
                {iniciales(item.usuario)}
            </span>
            <div className="actividad-globo">
                <div className="actividad-autor">
                    <strong>{propio ? "Tú" : item.usuario}</strong>
                    {item.rol_usuario && <span>{ETIQUETA_ROL[item.rol_usuario] ?? item.rol_usuario}</span>}
                </div>
                <p>{item.texto}</p>
                {item.adjuntos?.length > 0 && <Adjuntos adjuntos={item.adjuntos} />}
                <time dateTime={item.fecha}>{formatearFechaHora(item.fecha)}</time>
            </div>
        </li>
    );
}

// Panel de actividad del ticket, arriba a la derecha: el registro de todo lo
// que se dijo y se hizo, del mas viejo al mas nuevo como un chat, con la
// caja para escribir al pie. Dos canales: lo que ve el cliente (avances y
// cambios de estado) y las notas internas, que solo ve el taller.
//
// notas llega en null para el cliente: el servidor no se las manda, asi que
// la pestana interna ni existe para el. puedeEscribir apaga la caja (ticket
// cerrado, o el cliente, que solo lee).
export default function PanelActividad({
    actualizaciones,
    notas,
    idUsuario,
    puedeEscribir,
    guardando,
    error,
    onEnviar,
    pedido,
}) {
    const conNotas = Array.isArray(notas);
    const [canal, setCanal] = useState("publico");
    const lista = useRef(null);
    const panel = useRef(null);

    // pedido = { canal, vez }: un atajo de teclado pide escribir en un canal.
    // El canal se ajusta durante el render (al cambiar el pedido) y el foco
    // va en un efecto, cuando la caja de ese canal ya esta montada; vez
    // cambia en cada pedido, asi repetir la tecla vuelve a enfocar.
    const [pedidoAtendido, setPedidoAtendido] = useState(null);
    if (pedido && pedido !== pedidoAtendido) {
        setPedidoAtendido(pedido);
        if (pedido.canal === "publico" || conNotas) setCanal(pedido.canal);
    }
    useEffect(() => {
        if (pedidoAtendido) panel.current?.querySelector(".actividad-caja textarea")?.focus();
    }, [pedidoAtendido, canal]);

    const mensajes =
        canal === "publico"
            ? actualizaciones.map((a) => ({ ...a, clave: `a${a.id_actualizacion}`, texto: a.observaciones }))
            : (notas ?? []).map((n) => ({ ...n, clave: `n${n.id_nota}`, tipo: "Nota", texto: n.contenido }));

    // al abrir, al cambiar de canal y al llegar un mensaje se baja al ultimo,
    // como en cualquier chat
    useEffect(() => {
        if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
    }, [canal, mensajes.length]);

    const canales = [
        { id: "publico", etiqueta: conNotas ? "Para el cliente" : "Novedades", cantidad: actualizaciones.length },
        ...(conNotas ? [{ id: "interno", etiqueta: "Notas internas", cantidad: notas.length }] : []),
    ];

    return (
        <section ref={panel} className={`tarjeta actividad actividad-${canal}`} aria-labelledby="actividad-titulo">
            <div className="actividad-cabecera">
                <h2 id="actividad-titulo">Actividad</h2>
                {canales.length > 1 && (
                    <div className="actividad-canales" role="tablist" aria-label="Canal">
                        {canales.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                role="tab"
                                id={`actividad-tab-${c.id}`}
                                aria-selected={canal === c.id}
                                aria-controls="actividad-lista"
                                className="actividad-canal"
                                onClick={() => setCanal(c.id)}
                            >
                                {c.etiqueta}
                                <span className="actividad-cantidad">{c.cantidad}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {canal === "interno" && (
                <p className="actividad-aviso-interno">
                    Solo lo ve el personal del taller. El cliente nunca recibe estas notas.
                </p>
            )}

            <div
                ref={lista}
                id="actividad-lista"
                className="actividad-lista"
                // con pestanas es el panel de la elegida; con un solo canal la
                // seccion ya tiene nombre y la lista no necesita otro
                role={canales.length > 1 ? "tabpanel" : undefined}
                aria-labelledby={canales.length > 1 ? `actividad-tab-${canal}` : undefined}
                aria-label={canales.length > 1 ? undefined : "Mensajes"}
                tabIndex={0}
            >
                <ol className="actividad-mensajes" aria-live="polite">
                    {mensajes.length === 0 && (
                        <li className="actividad-vacia">
                            {canal === "interno"
                                ? "Todavía no hay notas internas."
                                : conNotas
                                  ? "Todavía no hay novedades para el cliente."
                                  : "Cuando el técnico avance con tu equipo, lo verás aquí."}
                        </li>
                    )}
                    {mensajes.map((item) => (
                        <Mensaje key={item.clave} item={item} propio={item.id_usuario === idUsuario} />
                    ))}
                </ol>
            </div>

            {puedeEscribir && (
                <div className="actividad-caja">
                    <FormularioSeguimiento
                        key={canal}
                        tipoFijo={canal === "interno" ? "notas" : "actualizaciones"}
                        guardando={guardando}
                        error={error}
                        onGuardar={onEnviar}
                    />
                </div>
            )}
        </section>
    );
}
