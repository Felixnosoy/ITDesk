import { createPortal } from "react-dom";
import { codigoTicket, formatearFecha, nombreEquipo } from "../utils/formato";
import Totales from "./Totales";
import TablaLineas from "./TablaLineas";
import Logo from "./Logo";
import "./Documento.css";

// Hoja para entregar al cliente: datos del taller, cliente, equipo, lineas
// y total. Lleva solo-imprimir: en pantalla no se ve, y el detalle la monta
// solo mientras se imprime (el resto de la pagina queda en no-imprimir).
// Va en un portal directo en body para quedar fuera de la pagina, que en ese
// momento esta oculta en papel.
export default function DocumentoImprimible({ titulo, numero, fecha, ticket, estado, documento, children }) {
    return createPortal(
        <article className="documento solo-imprimir">
            <header className="documento-cabecera">
                <Logo tamano="md" lema impresion />
                <div className="documento-titulo">
                    <h1>{titulo}</h1>
                    {numero && <p>{numero}</p>}
                    <p>Fecha: {formatearFecha(fecha)}</p>
                </div>
            </header>

            <dl className="documento-datos">
                <div>
                    <dt>Cliente</dt>
                    <dd>{ticket.cliente}</dd>
                </div>
                <div>
                    <dt>Ticket</dt>
                    <dd>
                        {codigoTicket(ticket.id_ticket)} · {ticket.titulo}
                    </dd>
                </div>
                <div>
                    <dt>Equipo</dt>
                    <dd>
                        {nombreEquipo(ticket)}
                        {ticket.equipo_numero_serie && ` · Serie ${ticket.equipo_numero_serie}`}
                    </dd>
                </div>
                <div>
                    <dt>Estado</dt>
                    <dd>{estado}</dd>
                </div>
            </dl>

            <TablaLineas lineas={documento.lineas} />
            <Totales montos={documento} />

            {children}
        </article>,
        document.body
    );
}
