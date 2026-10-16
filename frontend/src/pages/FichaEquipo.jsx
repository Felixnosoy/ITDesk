import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET, ETIQUETA_CANAL } from "../constants/tickets";
import { ESTADOS_FACTURA } from "../constants/cotizaciones";
import { obtenerEquipo, listarTickets } from "../api/tickets";
import { codigoTicket, formatearFecha, formatearMonto } from "../utils/formato";
import Insignia from "../components/Insignia";
import MigasDePan from "../components/MigasDePan";
import EstadoVacio from "../components/EstadoVacio";
import { EsqueletoDetalle } from "../components/Esqueleto";
import "./Fichas.css";

const Dato = ({ etiqueta, children }) => (
    <div className="ficha-dato">
        <dt>{etiqueta}</dt>
        <dd>{children || "—"}</dd>
    </div>
);

// garantia vigente si la fecha de vencimiento todavia no paso
function estadoGarantia(equipo) {
    if (!equipo.en_garantia) return { texto: "Sin garantía", tono: "gris" };
    if (!equipo.garantia_vence) return { texto: "En garantía", tono: "verde" };

    const vence = new Date(`${String(equipo.garantia_vence).slice(0, 10)}T23:59:59`);
    return vence >= new Date()
        ? { texto: `En garantía hasta ${formatearFecha(vence)}`, tono: "verde" }
        : { texto: `Garantía vencida el ${formatearFecha(vence)}`, tono: "rojo" };
}

// Ficha de un equipo con su historial: cada vez que entro al taller, como
// llego, en que termino y cuanto costo. Sirve para ver si una falla se
// repite y para decidir sobre la garantia. El cliente ve las de sus equipos.
export default function FichaEquipo() {
    const { id } = useParams();
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const esCliente = usuario.rol === ROLES.CLIENTE;

    const [datos, setDatos] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let vigente = true;

        Promise.all([obtenerEquipo(token, id), listarTickets(token, { id_equipo: id })])
            .then(([equipo, tickets]) => {
                if (!vigente) return;
                setDatos({ equipo, tickets });
                setError("");
            })
            .catch((err) => vigente && setError(err.message));

        return () => {
            vigente = false;
        };
    }, [token, id]);

    const listado = esCliente ? "Mis tickets" : "Tickets";

    if (error) {
        return (
            <div className="pagina">
                <MigasDePan elementos={[{ etiqueta: listado, ruta: "/tickets" }, { etiqueta: "Equipo" }]} />
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

    const { equipo, tickets } = datos;
    const nombre = `${equipo.marca} ${equipo.modelo}`;
    const garantia = estadoGarantia(equipo);
    const facturado = tickets.reduce((suma, t) => suma + Number(t.factura_total || 0), 0);
    const pagado = tickets
        .filter((t) => t.factura_estado === ESTADOS_FACTURA.PAGADA)
        .reduce((suma, t) => suma + Number(t.factura_total || 0), 0);
    const abiertos = tickets.filter((t) => t.estado !== ESTADOS_TICKET.CERRADO);
    // misma categoria mas de una vez: una falla que vuelve
    const categorias = tickets.reduce((cuenta, t) => ({ ...cuenta, [t.categoria]: (cuenta[t.categoria] ?? 0) + 1 }), {});
    const repetida = Object.entries(categorias).find(([, veces]) => veces > 1);

    // solo lo que se cargo: una ficha llena de guiones no informa nada
    const ficha = [
        ["Sistema operativo", equipo.sistema_operativo],
        ["Procesador", equipo.procesador],
        ["Memoria RAM", equipo.memoria_ram],
        ["Almacenamiento", equipo.almacenamiento],
        ["Color", equipo.color],
        ["Código de activo", equipo.codigo_activo],
        ["Observaciones", equipo.observaciones],
    ].filter(([, valor]) => valor);

    const migas = esCliente
        ? [{ etiqueta: listado, ruta: "/tickets" }, { etiqueta: nombre }]
        : [{ etiqueta: listado, ruta: "/tickets" }, { etiqueta: equipo.cliente, ruta: `/clientes/${equipo.id_usuario}` }, { etiqueta: nombre }];

    return (
        <div className="pagina ficha">
            <MigasDePan elementos={migas} />

            <div className="pagina-cabecera ficha-cabecera">
                <div className="ficha-cabecera-texto">
                    <span className="etiqueta-codigo ficha-serie">Serie {equipo.numero_serie}</span>
                    <h1>{nombre}</h1>
                    <p>
                        {equipo.tipo}
                        {!esCliente && (
                            <>
                                {" · de "}
                                <Link to={`/clientes/${equipo.id_usuario}`}>{equipo.cliente}</Link>
                            </>
                        )}
                        {" · registrado el "}
                        {formatearFecha(equipo.fecha_registro)}
                    </p>
                    <div className="ficha-insignias">
                        <span className={`insignia insignia-${garantia.tono}`}>{garantia.texto}</span>
                        {abiertos.length === 1 && (
                            <Link to={`/tickets/${abiertos[0].id_ticket}`} className="insignia insignia-azul ficha-en-taller">
                                En el taller ahora · {codigoTicket(abiertos[0].id_ticket)}
                            </Link>
                        )}
                        {abiertos.length > 1 && (
                            <span className="insignia insignia-azul">{abiertos.length} tickets abiertos</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="ficha-indicadores">
                <div className="tarjeta ficha-indicador">
                    <span>Visitas al taller</span>
                    <strong className="cifra">{tickets.length}</strong>
                </div>
                <div className="tarjeta ficha-indicador">
                    <span>Última visita</span>
                    <strong className="cifra ficha-cifra-monto">{tickets[0] ? formatearFecha(tickets[0].fecha_apertura) : "—"}</strong>
                </div>
                <div className="tarjeta ficha-indicador">
                    <span>Facturado en reparaciones</span>
                    <strong className="cifra ficha-cifra-monto">{formatearMonto(facturado)}</strong>
                </div>
                <div className="tarjeta ficha-indicador">
                    <span>Pagado</span>
                    <strong className="cifra ficha-cifra-monto">{formatearMonto(pagado)}</strong>
                </div>
            </div>

            {/* pista para el taller: al cliente no le corresponde */}
            {repetida && !esCliente && (
                <div className="aviso ficha-aviso" role="note">
                    Este equipo ya entró {repetida[1]} veces por {repetida[0].toLowerCase()}. Conviene revisar si es la misma falla.
                </div>
            )}

            <div className="ficha-columnas">
                <aside className="ficha-lateral" aria-label="Ficha técnica">
                    <section className="tarjeta" aria-labelledby="ficha-tecnica">
                        <h2 id="ficha-tecnica">Ficha técnica</h2>
                        {ficha.length === 0 ? (
                            <p className="ficha-vacio">
                                No se cargaron especificaciones de este equipo. Se registran al dar de alta el equipo en
                                recepción.
                            </p>
                        ) : (
                            <dl className="ficha-datos">
                                {ficha.map(([etiqueta, valor]) => (
                                    <Dato key={etiqueta} etiqueta={etiqueta}>
                                        {valor}
                                    </Dato>
                                ))}
                            </dl>
                        )}
                    </section>
                </aside>

                <section className="tarjeta ficha-historial" aria-labelledby="ficha-visitas">
                    <h2 id="ficha-visitas">Historial de visitas</h2>
                    {tickets.length === 0 ? (
                        <EstadoVacio titulo="Sin visitas todavía" texto="Este equipo está registrado pero nunca entró al taller." />
                    ) : (
                        <ol className="ficha-visitas-lista">
                            {tickets.map((t) => (
                                <li key={t.id_ticket} className={`ficha-visita ficha-visita-${t.estado === ESTADOS_TICKET.CERRADO ? "cerrada" : "abierta"}`}>
                                    <span className="ficha-visita-punto" aria-hidden="true" />
                                    <div className="ficha-visita-cuerpo">
                                        <div className="ficha-visita-cabecera">
                                            <Link to={`/tickets/${t.id_ticket}`} className="ficha-visita-titulo">
                                                <span className="etiqueta-codigo">{codigoTicket(t.id_ticket)}</span>
                                                <strong>{t.titulo}</strong>
                                            </Link>
                                            <Insignia tipo="estado" valor={t.estado} />
                                        </div>
                                        <p className="ficha-visita-meta">
                                            {formatearFecha(t.fecha_apertura)}
                                            {t.fecha_cierre ? ` → entregado ${formatearFecha(t.fecha_cierre)}` : ""}
                                            {" · "}
                                            {t.categoria}
                                            {" · "}
                                            {ETIQUETA_CANAL[t.canal_entrada] ?? t.canal_entrada}
                                            {!esCliente && t.tecnico ? ` · ${t.tecnico}` : ""}
                                        </p>
                                        {(t.accesorios || t.condicion_fisica) && (
                                            <p className="ficha-visita-recepcion">
                                                {t.accesorios && <>Dejó: {t.accesorios}. </>}
                                                {t.condicion_fisica && <>Llegó: {t.condicion_fisica}</>}
                                            </p>
                                        )}
                                        {t.factura_total && (
                                            <p className="ficha-visita-monto">
                                                {formatearMonto(t.factura_total)} ·{" "}
                                                <Insignia tipo="factura" valor={t.factura_estado} />
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
}
