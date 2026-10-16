import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET } from "../constants/tickets";
import { ESTADOS_FACTURA } from "../constants/cotizaciones";
import { obtenerUsuario } from "../api/usuarios";
import { listarEquipos, listarTickets } from "../api/tickets";
import { codigoTicket, etiquetaDocumento, formatearFecha, formatearMonto, iniciales, nombreEquipo } from "../utils/formato";
import { ordenarFilas, siguienteOrden } from "../utils/tabla";
import Insignia from "../components/Insignia";
import TablaOrdenable from "../components/TablaOrdenable";
import MigasDePan from "../components/MigasDePan";
import EstadoVacio from "../components/EstadoVacio";
import { EsqueletoDetalle } from "../components/Esqueleto";
import "./Fichas.css";

const ROLES_QUE_REGISTRAN = [ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR];
const ORDEN_ESTADO = Object.values(ESTADOS_TICKET);

const Dato = ({ etiqueta, children }) => (
    <div className="ficha-dato">
        <dt>{etiqueta}</dt>
        <dd>{children || "—"}</dd>
    </div>
);

// Ficha de un cliente para el personal del taller: como contactarlo, sus
// equipos y todo su historial de tickets en una pagina. Es a donde lleva el
// buscador global cuando se elige un cliente.
export default function FichaCliente() {
    const { id } = useParams();
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const navegar = useNavigate();

    const [datos, setDatos] = useState(null);
    const [error, setError] = useState("");
    const [orden, setOrden] = useState({ columna: "fecha_apertura", direccion: "desc" });

    useEffect(() => {
        let vigente = true;

        Promise.all([obtenerUsuario(token, id), listarEquipos(token, id), listarTickets(token, { id_cliente: id })])
            .then(([cliente, equipos, tickets]) => {
                if (!vigente) return;
                setDatos({ cliente, equipos, tickets });
                setError("");
            })
            .catch((err) => vigente && setError(err.message));

        return () => {
            vigente = false;
        };
    }, [token, id]);

    const columnas = useMemo(
        () => [
            { clave: "id_ticket", titulo: "Código", render: (t) => <span className="etiqueta-codigo">{codigoTicket(t.id_ticket)}</span> },
            {
                clave: "titulo",
                titulo: "Ticket",
                clase: "celda-principal",
                render: (t) => <Link to={`/tickets/${t.id_ticket}`}>{t.titulo}</Link>,
            },
            { clave: "equipo", titulo: "Equipo", render: (t) => `${t.equipo_marca} ${t.equipo_modelo}`, valorOrden: nombreEquipo },
            {
                clave: "estado",
                titulo: "Estado",
                render: (t) => <Insignia tipo="estado" valor={t.estado} />,
                valorOrden: (t) => ORDEN_ESTADO.indexOf(t.estado),
            },
            {
                clave: "fecha_apertura",
                titulo: "Apertura",
                render: (t) => formatearFecha(t.fecha_apertura),
                valorOrden: (t) => new Date(t.fecha_apertura).getTime(),
            },
        ],
        []
    );

    if (error) {
        return (
            <div className="pagina">
                <MigasDePan elementos={[{ etiqueta: "Tickets", ruta: "/tickets" }, { etiqueta: "Cliente" }]} />
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    if (!datos) {
        return (
            <div className="pagina">
                <EsqueletoDetalle />
            </div>
        );
    }

    const { cliente, equipos, tickets } = datos;
    const nombre = `${cliente.nombre} ${cliente.apellido}`;
    const activos = tickets.filter((t) => t.estado !== ESTADOS_TICKET.CERRADO);
    const porCobrar = tickets
        .filter((t) => t.factura_estado === ESTADOS_FACTURA.PENDIENTE)
        .reduce((suma, t) => suma + Number(t.factura_total || 0), 0);
    const visitasPorEquipo = (idEquipo) => tickets.filter((t) => t.id_equipo === idEquipo).length;
    const esEmpresa = cliente.tipo_cliente === "Empresa";

    return (
        <div className="pagina ficha">
            <MigasDePan elementos={[{ etiqueta: "Tickets", ruta: "/tickets" }, { etiqueta: nombre }]} />

            <div className="pagina-cabecera ficha-cabecera">
                <span className="ficha-avatar" aria-hidden="true">
                    {iniciales(nombre)}
                </span>
                <div className="ficha-cabecera-texto">
                    <h1>{nombre}</h1>
                    <p>
                        {esEmpresa && cliente.empresa ? `${cliente.empresa} · ` : ""}
                        Cliente desde {formatearFecha(cliente.fecha_registro)}
                    </p>
                    <div className="ficha-insignias">
                        <span className={`insignia insignia-${cliente.estado === "Activo" ? "verde" : "apagado"}`}>{cliente.estado}</span>
                        <span className="insignia insignia-gris">{esEmpresa ? "Empresa" : "Persona"}</span>
                    </div>
                </div>
                {ROLES_QUE_REGISTRAN.includes(usuario.rol) && cliente.estado === "Activo" && (
                    <Link to={`/tickets/nuevo?cliente=${cliente.id_usuario}`} className="boton">
                        + Registrar ticket
                    </Link>
                )}
            </div>

            <div className="ficha-indicadores">
                <div className="tarjeta ficha-indicador">
                    <span>Tickets en total</span>
                    <strong className="cifra">{tickets.length}</strong>
                </div>
                <div className="tarjeta ficha-indicador">
                    <span>Activos ahora</span>
                    <strong className="cifra">{activos.length}</strong>
                </div>
                <div className="tarjeta ficha-indicador">
                    <span>Equipos registrados</span>
                    <strong className="cifra">{equipos.length}</strong>
                </div>
                <div className="tarjeta ficha-indicador">
                    <span>Por cobrar</span>
                    <strong className="cifra ficha-cifra-monto">{formatearMonto(porCobrar)}</strong>
                </div>
            </div>

            <div className="ficha-columnas">
                <aside className="ficha-lateral" aria-label="Contacto y equipos">
                    <section className="tarjeta" aria-labelledby="ficha-contacto">
                        <h2 id="ficha-contacto">Contacto</h2>
                        <dl className="ficha-datos">
                            <Dato etiqueta="Teléfono">
                                {cliente.telefono && <a href={`tel:${cliente.telefono}`}>{cliente.telefono}</a>}
                            </Dato>
                            <Dato etiqueta="Correo">
                                <a href={`mailto:${cliente.correo}`}>{cliente.correo}</a>
                            </Dato>
                            <Dato etiqueta="Dirección">{cliente.direccion}</Dato>
                            <Dato etiqueta={etiquetaDocumento(cliente.tipo_documento)}>{cliente.num_documento}</Dato>
                            {esEmpresa && <Dato etiqueta="RNC">{cliente.rnc}</Dato>}
                            {(cliente.contacto_alterno_nombre || cliente.contacto_alterno_telefono) && (
                                <Dato etiqueta="Contacto alterno">
                                    {cliente.contacto_alterno_nombre}
                                    {cliente.contacto_alterno_telefono && (
                                        <>
                                            {" · "}
                                            <a href={`tel:${cliente.contacto_alterno_telefono}`}>{cliente.contacto_alterno_telefono}</a>
                                        </>
                                    )}
                                </Dato>
                            )}
                        </dl>
                    </section>

                    <section className="tarjeta" aria-labelledby="ficha-equipos">
                        <h2 id="ficha-equipos">Equipos</h2>
                        {equipos.length === 0 ? (
                            <p className="ficha-vacio">Todavía no tiene equipos registrados.</p>
                        ) : (
                            <ul className="ficha-equipos">
                                {equipos.map((e) => (
                                    <li key={e.id_equipo}>
                                        <Link to={`/equipos/${e.id_equipo}`}>
                                            <strong>
                                                {e.marca} {e.modelo}
                                            </strong>
                                            <span>
                                                {e.tipo} · Serie {e.numero_serie}
                                            </span>
                                        </Link>
                                        <span className="ficha-visitas">
                                            {visitasPorEquipo(e.id_equipo)} {visitasPorEquipo(e.id_equipo) === 1 ? "visita" : "visitas"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </aside>

                <section className="tarjeta ficha-historial" aria-labelledby="ficha-tickets">
                    <h2 id="ficha-tickets">Historial de tickets</h2>
                    <TablaOrdenable
                        columnas={columnas}
                        filas={ordenarFilas(tickets, columnas, orden)}
                        claveFila={(t) => t.id_ticket}
                        orden={orden}
                        onOrdenar={(columna) => setOrden((actual) => siguienteOrden(actual, columna))}
                        onFila={(t) => navegar(`/tickets/${t.id_ticket}`)}
                        tarjetas
                        textoVacio={<EstadoVacio titulo="Sin tickets todavía" texto="Cuando este cliente deje un equipo, su historial aparecerá aquí." />}
                    />
                </section>
            </div>
        </div>
    );
}
