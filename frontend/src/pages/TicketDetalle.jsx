import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerDetalle, registrarDiagnostico, cambiarEstado, registrarSeguimiento } from "../api/tickets";
import { crearCotizacion, decidirCotizacion } from "../api/cotizaciones";
import { generarFactura, pagarFactura } from "../api/facturas";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET, ETIQUETA_ESTADO } from "../constants/tickets";
import { ESTADOS_COTIZACION, ESTADOS_FACTURA } from "../constants/cotizaciones";
import {
    codigoCotizacion,
    codigoFactura,
    codigoTicket,
    formatearFecha,
    formatearFechaHora,
} from "../utils/formato";
import Insignia from "../components/Insignia";
import LineaTiempo from "../components/LineaTiempo";
import FormularioDiagnostico from "../components/FormularioDiagnostico";
import CambioEstado from "../components/CambioEstado";
import FormularioSeguimiento from "../components/FormularioSeguimiento";
import Adjuntos from "../components/Adjuntos";
import EditorCotizacion from "../components/EditorCotizacion";
import { SeccionCotizaciones } from "../components/Cotizacion";
import DecisionCotizacion from "../components/DecisionCotizacion";
import Factura from "../components/Factura";
import ConfirmarFactura from "../components/ConfirmarFactura";
import FormularioPago from "../components/FormularioPago";
import DocumentoImprimible from "../components/DocumentoImprimible";
import "./TicketDetalle.css";

const Dato = ({ etiqueta, children }) => (
    <div className="detalle-dato">
        <dt>{etiqueta}</dt>
        <dd>{children}</dd>
    </div>
);

// Detalle de un ticket en una sola pantalla: resumen, cliente, equipo,
// tecnico, descripcion y diagnostico.
//
// Vista del taller o del cliente: no se decide por el rol sino por lo que
// manda el servidor. Al Cliente no le llegan notas_privadas, asi que la
// pantalla nunca puede mostrarle algo que el backend no le dio.
export default function TicketDetalle() {
    const { id } = useParams();
    const location = useLocation();
    const { sesion } = useAuth();
    const { token } = sesion;

    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState("");
    // al llegar desde el registro, el aviso de confirmacion viene en el state
    const [aviso, setAviso] = useState(() => location.state?.aviso ?? "");

    // seccion que se esta editando ("diagnostico"...) y su estado de guardado
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [errorAccion, setErrorAccion] = useState("");
    // documento que se esta imprimiendo ("cotizacion"...): mientras dura, la
    // pantalla queda en no-imprimir y en papel sale solo el documento
    const [imprimiendo, setImprimiendo] = useState(null);

    useEffect(() => {
        if (!imprimiendo) return undefined;

        // afterprint llega al cerrar el dialogo, se imprima o se cancele
        const terminar = () => setImprimiendo(null);
        window.addEventListener("afterprint", terminar);
        window.print();

        return () => window.removeEventListener("afterprint", terminar);
    }, [imprimiendo]);


    useEffect(() => {
        let vigente = true;

        obtenerDetalle(token, id)
            .then((datos) => {
                if (!vigente) return;
                setDetalle(datos);
                setError("");
            })
            .catch((err) => {
                if (vigente) setError(err.message);
            });

        return () => {
            vigente = false;
        };
    }, [token, id]);

    const abrirEdicion = (seccion) => {
        setAviso("");
        setErrorAccion("");
        setEditando(seccion);
    };

    // ejecuta una accion contra el servidor y vuelve a pedir el detalle antes
    // de avisar, asi el aviso nunca aparece junto a datos viejos; si falla
    // deja el formulario abierto con el mensaje del servidor
    const ejecutar = async (accion, mensajeExito) => {
        setGuardando(true);
        setErrorAccion("");

        try {
            await accion();
            setDetalle(await obtenerDetalle(token, id));
            setEditando(null);
            setAviso(mensajeExito);
            return true;
        } catch (err) {
            setErrorAccion(err.message);
            return false;
        } finally {
            setGuardando(false);
        }
    };

    if (error) {
        return (
            <div className="pagina">
                <Link to="/tickets" className="detalle-volver no-imprimir">← Volver a tickets</Link>
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    if (!detalle) {
        return (
            <div className="pagina">
                <p>Cargando ticket...</p>
            </div>
        );
    }

    const { ticket, diagnostico } = detalle;
    const esTaller = "notas_privadas" in detalle;
    const estaCerrado = ticket.estado === ESTADOS_TICKET.CERRADO;
    const puedeEditar = esTaller && !estaCerrado;
    // Recepcion ve el detalle completo pero no cambia estados (lo hace el tecnico)
    const puedeCambiarEstado =
        [ROLES.TECNICO, ROLES.ADMINISTRADOR].includes(sesion.usuario.rol) && detalle.estados_siguientes?.length > 0;
    const cotizaciones = detalle.cotizaciones ?? [];
    // cotizable ya dice si se puede cotizar ahora (hay diagnostico, no hay
    // otra vigente, no esta resuelto); el rol es porque Recepcion no cotiza
    const puedeCotizar = detalle.cotizable && [ROLES.TECNICO, ROLES.ADMINISTRADOR].includes(sesion.usuario.rol);
    // el cliente solo ve la tarjeta cuando ya tiene algo que mirar
    const mostrarCotizacion = cotizaciones.length > 0 || (esTaller && Boolean(diagnostico));
    const pendiente = cotizaciones[0]?.estado === ESTADOS_COTIZACION.PENDIENTE ? cotizaciones[0] : null;
    // solo el cliente dueno decide; al personal el servidor le responde 403
    const puedeDecidir = pendiente && sesion.usuario.rol === ROLES.CLIENTE;

    const { factura } = detalle;
    const aprobada = cotizaciones.find((c) => c.estado === ESTADOS_COTIZACION.APROBADA);
    // facturable solo le llega al taller; Recepcion lo ve pero no factura
    const puedeFacturar =
        detalle.facturable && aprobada && [ROLES.TECNICO, ROLES.ADMINISTRADOR].includes(sesion.usuario.rol);
    const mostrarFactura = Boolean(factura) || Boolean(detalle.facturable);
    // solo el cliente dueno paga; al personal el servidor le responde 403
    const puedePagar = factura?.estado === ESTADOS_FACTURA.PENDIENTE && sesion.usuario.rol === ROLES.CLIENTE;

    // el aviso dice en que quedo el ticket, que es lo que le importa al cliente
    const decidir = (datos) =>
        ejecutar(async () => {
            await decidirCotizacion(token, ticket.id_ticket, pendiente.id_cotizacion, datos);
        }, datos.estado === ESTADOS_COTIZACION.APROBADA
            ? `Aprobaste la cotización. Tu ticket pasó a "${ETIQUETA_ESTADO[ESTADOS_TICKET.EN_REPARACION]}".`
            : `Rechazaste la cotización. Tu ticket volvió a "${ETIQUETA_ESTADO[ESTADOS_TICKET.EN_DIAGNOSTICO]}" y el técnico puede prepararte otra.`);

    const cotizacionActual = cotizaciones[0];

    return (
        <div className={`pagina detalle-pagina${imprimiendo ? " no-imprimir" : ""}`}>
            <Link to="/tickets" className="detalle-volver no-imprimir">← Volver a tickets</Link>

            <div className="pagina-cabecera detalle-cabecera">
                <span className="detalle-codigo etiqueta-codigo">{codigoTicket(ticket.id_ticket)}</span>
                <h1>{ticket.titulo}</h1>
                <div className="detalle-insignias">
                    <Insignia tipo="estado" valor={ticket.estado} />
                    <Insignia tipo="prioridad" valor={ticket.prioridad} />
                    <Insignia tipo="categoria" valor={ticket.categoria} />
                </div>
            </div>

            {aviso && (
                <div className="aviso aviso-ok" role="status">
                    {aviso}
                </div>
            )}

            <div className="detalle-columnas">
                <div className="detalle-principal">
                    <div className="tarjeta">
                        <h2>Descripción del problema</h2>
                        <p className="detalle-texto">{ticket.descripcion}</p>
                    </div>

                    <div className="tarjeta">
                        <div className="detalle-titulo-fila">
                            <h2>Diagnóstico</h2>
                            {puedeEditar && editando !== "diagnostico" && (
                                <button
                                    type="button"
                                    className="boton boton-chico boton-secundario"
                                    onClick={() => abrirEdicion("diagnostico")}
                                >
                                    {diagnostico ? "Editar" : "Registrar diagnóstico"}
                                </button>
                            )}
                        </div>
                        {editando === "diagnostico" ? (
                            <FormularioDiagnostico
                                diagnostico={diagnostico}
                                guardando={guardando}
                                error={errorAccion}
                                onCancelar={() => setEditando(null)}
                                onGuardar={(valores) =>
                                    ejecutar(
                                        () => registrarDiagnostico(token, ticket.id_ticket, valores),
                                        diagnostico ? "Diagnóstico actualizado." : "Diagnóstico registrado."
                                    )
                                }
                            />
                        ) : diagnostico ? (
                            <dl className="detalle-datos">
                                <Dato etiqueta="Diagnóstico">
                                    <span className="detalle-texto">{diagnostico.diagnostico}</span>
                                </Dato>
                                {diagnostico.solucion && (
                                    <Dato etiqueta="Solución propuesta">
                                        <span className="detalle-texto">{diagnostico.solucion}</span>
                                    </Dato>
                                )}
                                {diagnostico.observaciones && (
                                    <Dato etiqueta="Observaciones">
                                        <span className="detalle-texto">{diagnostico.observaciones}</span>
                                    </Dato>
                                )}
                                <Dato etiqueta="Registrado por">
                                    {diagnostico.tecnico} · {formatearFechaHora(diagnostico.fecha_edicion ?? diagnostico.fecha_diagnostico)}
                                    {diagnostico.fecha_edicion && " (editado)"}
                                </Dato>
                            </dl>
                        ) : (
                            <p className="detalle-vacio">
                                {esTaller
                                    ? "Todavía no tiene diagnóstico. Sin diagnóstico el ticket no se puede cotizar."
                                    : "El técnico todavía está revisando tu equipo."}
                            </p>
                        )}
                    </div>

                    {mostrarCotizacion && (
                        <div className="tarjeta">
                            <div className="detalle-titulo-fila">
                                <h2>Cotización</h2>
                                {cotizacionActual && editando !== "cotizacion" && (
                                    <button
                                        type="button"
                                        className="boton boton-chico boton-secundario detalle-imprimir"
                                        onClick={() => setImprimiendo("cotizacion")}
                                    >
                                        Imprimir
                                    </button>
                                )}
                                {puedeCotizar && editando !== "cotizacion" && (
                                    <button
                                        type="button"
                                        className="boton boton-chico boton-secundario"
                                        onClick={() => abrirEdicion("cotizacion")}
                                    >
                                        {cotizaciones.length > 0 ? "Nueva cotización" : "Crear cotización"}
                                    </button>
                                )}
                            </div>
                            {editando === "cotizacion" ? (
                                <EditorCotizacion
                                    guardando={guardando}
                                    error={errorAccion}
                                    onCancelar={() => setEditando(null)}
                                    onGuardar={(valores) =>
                                        ejecutar(
                                            () => crearCotizacion(token, ticket.id_ticket, valores),
                                            "Cotización enviada. El ticket queda esperando la aprobación del cliente."
                                        )
                                    }
                                />
                            ) : (
                                <SeccionCotizaciones
                                    cotizaciones={cotizaciones}
                                    vacio="Todavía no hay cotización para este ticket."
                                    acciones={
                                        puedeDecidir ? (
                                            <div className="cotizacion-acciones no-imprimir">
                                                <p>¿Autorizas la reparación por este monto?</p>
                                                <button
                                                    type="button"
                                                    className="boton boton-secundario"
                                                    onClick={() => abrirEdicion(ESTADOS_COTIZACION.RECHAZADA)}
                                                >
                                                    Rechazar
                                                </button>
                                                <button
                                                    type="button"
                                                    className="boton"
                                                    onClick={() => abrirEdicion(ESTADOS_COTIZACION.APROBADA)}
                                                >
                                                    Aprobar
                                                </button>
                                            </div>
                                        ) : pendiente && esTaller ? (
                                            <p className="cotizacion-espera">
                                                Esperando la decisión del cliente. El ticket se mueve solo cuando
                                                apruebe o rechace.
                                            </p>
                                        ) : null
                                    }
                                />
                            )}
                        </div>
                    )}

                    {mostrarFactura && (
                        <div className="tarjeta">
                            <div className="detalle-titulo-fila">
                                <h2>Factura</h2>
                                {factura && (
                                    <button
                                        type="button"
                                        className="boton boton-chico boton-secundario detalle-imprimir"
                                        onClick={() => setImprimiendo("factura")}
                                    >
                                        Imprimir
                                    </button>
                                )}
                                {puedeFacturar && (
                                    <button type="button" className="boton boton-chico" onClick={() => abrirEdicion("factura")}>
                                        Generar factura
                                    </button>
                                )}
                            </div>
                            {factura ? (
                                <Factura
                                    factura={factura}
                                    pie={
                                        puedePagar && (
                                            <div className="factura-pie no-imprimir">
                                                <p>Esta factura está pendiente de pago.</p>
                                                <button type="button" className="boton" onClick={() => abrirEdicion("pago")}>
                                                    Pagar en línea
                                                </button>
                                            </div>
                                        )
                                    }
                                />
                            ) : (
                                <p className="detalle-vacio">
                                    La cotización está aprobada y todavía no se emitió la factura.
                                    {puedeFacturar && " Genérala cuando el trabajo esté listo para cobrar."}
                                </p>
                            )}
                        </div>
                    )}

                    {puedeEditar && (
                        <div className="tarjeta no-imprimir">
                            <h2>Registrar novedad</h2>
                            <FormularioSeguimiento
                                guardando={guardando}
                                error={editando === "seguimiento" ? errorAccion : ""}
                                onGuardar={(tipo, texto, imagenes) => {
                                    setEditando("seguimiento");
                                    return ejecutar(
                                        () => registrarSeguimiento(token, ticket.id_ticket, tipo, texto, imagenes),
                                        tipo === "notas" ? "Nota privada registrada." : "Avance registrado."
                                    );
                                }}
                            />
                        </div>
                    )}

                    <div className="tarjeta">
                        <h2>Línea de tiempo</h2>
                        <LineaTiempo
                            actualizaciones={detalle.actualizaciones}
                            renderAdjuntos={(adjuntos) => <Adjuntos adjuntos={adjuntos} />}
                        />
                    </div>

                    {esTaller && (
                        <div className="tarjeta detalle-privado">
                            <div className="detalle-titulo-fila">
                                <h2>Notas privadas</h2>
                                <span className="detalle-etiqueta-privada">Solo el taller</span>
                            </div>
                            {detalle.notas_privadas.length === 0 ? (
                                <p className="detalle-vacio">No hay notas privadas.</p>
                            ) : (
                                <ul className="detalle-notas">
                                    {detalle.notas_privadas.map((nota) => (
                                        <li key={nota.id_nota}>
                                            <p className="detalle-texto">{nota.contenido}</p>
                                            {nota.adjuntos.length > 0 && <Adjuntos adjuntos={nota.adjuntos} />}
                                            <span className="detalle-autor">
                                                {nota.usuario} · {formatearFechaHora(nota.fecha)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <aside className="detalle-lateral">
                    <div className="tarjeta">
                        <h2>Resumen</h2>
                        <dl className="detalle-datos">
                            <Dato etiqueta="Apertura">{formatearFechaHora(ticket.fecha_apertura)}</Dato>
                            {ticket.fecha_resolucion && (
                                <Dato etiqueta="Resolución">
                                    {formatearFecha(ticket.fecha_resolucion)}
                                    {ticket.resuelto_sin_costo === 1 && " · sin costo"}
                                </Dato>
                            )}
                            {ticket.fecha_cierre && <Dato etiqueta="Cierre">{formatearFecha(ticket.fecha_cierre)}</Dato>}
                            <Dato etiqueta="Técnico asignado">{ticket.tecnico ?? "Sin asignar"}</Dato>
                            {esTaller && <Dato etiqueta="Cliente">{ticket.cliente}</Dato>}
                        </dl>
                        {puedeCambiarEstado && (
                            <div className="detalle-acciones-estado">
                                <button type="button" className="boton" onClick={() => abrirEdicion("estado")}>
                                    Cambiar estado
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="tarjeta">
                        <h2>Equipo</h2>
                        <dl className="detalle-datos">
                            <Dato etiqueta="Tipo">{ticket.equipo_tipo}</Dato>
                            <Dato etiqueta="Marca y modelo">
                                {ticket.equipo_marca} {ticket.equipo_modelo}
                            </Dato>
                            <Dato etiqueta="Número de serie">{ticket.equipo_numero_serie}</Dato>
                        </dl>
                    </div>
                </aside>
            </div>

            {puedeDecidir && [ESTADOS_COTIZACION.APROBADA, ESTADOS_COTIZACION.RECHAZADA].includes(editando) && (
                <DecisionCotizacion
                    cotizacion={pendiente}
                    decision={editando}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={() => setEditando(null)}
                    onConfirmar={decidir}
                />
            )}

            {puedeFacturar && editando === "factura" && (
                <ConfirmarFactura
                    cotizacion={aprobada}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={() => setEditando(null)}
                    onConfirmar={() =>
                        ejecutar(
                            () => generarFactura(token, ticket.id_ticket),
                            "Factura generada. Ya se puede pasar el ticket a Resuelto."
                        )
                    }
                />
            )}

            {puedePagar && editando === "pago" && (
                <FormularioPago
                    factura={factura}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={() => setEditando(null)}
                    onPagar={(datos) =>
                        ejecutar(() => pagarFactura(token, ticket.id_ticket, datos), "Pago recibido. Tu factura quedó pagada.")
                    }
                />
            )}

            {editando === "estado" && (
                <CambioEstado
                    estadoActual={ticket.estado}
                    siguientes={detalle.estados_siguientes}
                    tieneDiagnostico={Boolean(diagnostico)}
                    tieneFactura={Boolean(detalle.factura)}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={() => setEditando(null)}
                    onGuardar={(datos) =>
                        ejecutar(() => cambiarEstado(token, ticket.id_ticket, datos), "Estado actualizado.")
                    }
                />
            )}

            {imprimiendo === "cotizacion" && cotizacionActual && (
                <DocumentoImprimible
                    titulo="Cotización"
                    numero={codigoCotizacion(cotizacionActual.id_cotizacion)}
                    fecha={cotizacionActual.fecha_creacion}
                    ticket={ticket}
                    estado={<Insignia tipo="cotizacion" valor={cotizacionActual.estado} />}
                    documento={cotizacionActual}
                >
                    {cotizacionActual.observaciones && (
                        <p className="documento-nota">
                            <strong>Observaciones:</strong> {cotizacionActual.observaciones}
                        </p>
                    )}
                    {cotizacionActual.motivo_rechazo && (
                        <p className="documento-nota">
                            <strong>Motivo del rechazo:</strong> {cotizacionActual.motivo_rechazo}
                        </p>
                    )}
                    <footer className="documento-pie">
                        <p>Montos en pesos dominicanos (RD$). El total incluye ITBIS del 18%.</p>
                        <p>Preparada por {cotizacionActual.creada_por}.</p>
                    </footer>
                </DocumentoImprimible>
            )}

            {imprimiendo === "factura" && factura && (
                <DocumentoImprimible
                    titulo="Factura"
                    numero={codigoFactura(factura.id_factura)}
                    fecha={factura.fecha_emision}
                    ticket={ticket}
                    estado={<Insignia tipo="factura" valor={factura.estado} />}
                    documento={factura}
                >
                    {factura.estado === ESTADOS_FACTURA.PAGADA ? (
                        <p className="documento-nota">
                            <strong>Pagada</strong> el {formatearFechaHora(factura.fecha_pago)} con la tarjeta terminada
                            en {factura.tarjeta_ultimos4}. Referencia del pago: {factura.referencia_pago}.
                        </p>
                    ) : (
                        <p className="documento-nota">
                            <strong>Pendiente de pago.</strong>
                        </p>
                    )}
                    <footer className="documento-pie">
                        <p>Montos en pesos dominicanos (RD$). El total incluye ITBIS del 18%.</p>
                        <p>Emitida por {factura.emitida_por}.</p>
                    </footer>
                </DocumentoImprimible>
            )}
        </div>
    );
}
