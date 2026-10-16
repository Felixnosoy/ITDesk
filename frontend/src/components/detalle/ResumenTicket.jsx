import { Link } from "react-router-dom";
import { ETIQUETA_CANAL } from "../../constants/tickets";
import { formatearFecha, formatearFechaHora } from "../../utils/formato";
import Dato from "./Dato";

// ficha tecnica del equipo: solo lo que se cargo, para no llenar de guiones
const fichaDe = (ticket) =>
    [
        ["Sistema operativo", ticket.equipo_sistema_operativo],
        ["Procesador", ticket.equipo_procesador],
        ["Memoria RAM", ticket.equipo_memoria_ram],
        ["Almacenamiento", ticket.equipo_almacenamiento],
        ["Color", ticket.equipo_color],
        [
            "Garantía",
            ticket.equipo_en_garantia
                ? `Sí${ticket.equipo_garantia_vence ? `, vence ${formatearFecha(ticket.equipo_garantia_vence)}` : ""}`
                : null,
        ],
        ["Código de activo", ticket.equipo_codigo_activo],
    ].filter(([, valor]) => valor);

const encendia = (valor) => (valor === null ? "No se probó" : valor ? "Sí" : "No");

// Lo que se sabe del caso: el problema, a quien y que equipo, como se recibio
// y la ficha tecnica. Equipo y cliente llevan a su ficha con historial.
export default function ResumenTicket({ ticket, esTaller }) {
    const ficha = fichaDe(ticket);

    return (
        <div className="tarjeta">
            <h2>Problema reportado</h2>
            <p className="detalle-texto">{ticket.descripcion}</p>
            <dl className="detalle-resumen">
                <Dato etiqueta="Equipo">
                    <Link to={`/equipos/${ticket.id_equipo}`} className="detalle-enlace">
                        {ticket.equipo_tipo} {ticket.equipo_marca} {ticket.equipo_modelo}
                    </Link>
                </Dato>
                <Dato etiqueta="Número de serie">
                    <span className="detalle-serie">{ticket.equipo_numero_serie}</span>
                </Dato>
                {esTaller && (
                    <Dato etiqueta="Cliente">
                        <Link to={`/clientes/${ticket.id_usuario}`} className="detalle-enlace">
                            {ticket.cliente}
                        </Link>
                    </Dato>
                )}
                <Dato etiqueta="Técnico asignado">{ticket.tecnico ?? "Sin asignar"}</Dato>
                <Dato etiqueta="Apertura">{formatearFechaHora(ticket.fecha_apertura)}</Dato>
                {ticket.fecha_resolucion && (
                    <Dato etiqueta="Resolución">
                        {formatearFecha(ticket.fecha_resolucion)}
                        {ticket.resuelto_sin_costo === 1 && " · sin costo"}
                    </Dato>
                )}
                {ticket.fecha_cierre && <Dato etiqueta="Cierre">{formatearFecha(ticket.fecha_cierre)}</Dato>}
            </dl>

            <h3 className="detalle-subtitulo">Recepción del equipo</h3>
            <dl className="detalle-resumen detalle-resumen-sin-linea">
                <Dato etiqueta="Canal de entrada">{ETIQUETA_CANAL[ticket.canal_entrada] ?? ticket.canal_entrada}</Dato>
                <Dato etiqueta="Accesorios">{ticket.accesorios || "Ninguno"}</Dato>
                <Dato etiqueta="Encendía al recibirlo">{encendia(ticket.enciende_al_recibir)}</Dato>
                <Dato etiqueta="Contraseña del equipo">
                    {ticket.dejo_contrasena ? (esTaller ? "La dejó (ver notas internas)" : "La dejaste") : "No la dejó"}
                </Dato>
                {ticket.condicion_fisica && (
                    <Dato etiqueta="Estado físico" ancho>
                        <span className="detalle-texto">{ticket.condicion_fisica}</span>
                    </Dato>
                )}
            </dl>

            {ficha.length > 0 && (
                <>
                    <h3 className="detalle-subtitulo">Ficha del equipo</h3>
                    <dl className="detalle-resumen detalle-resumen-sin-linea">
                        {ficha.map(([etiqueta, valor]) => (
                            <Dato key={etiqueta} etiqueta={etiqueta}>
                                {valor}
                            </Dato>
                        ))}
                    </dl>
                </>
            )}
        </div>
    );
}
