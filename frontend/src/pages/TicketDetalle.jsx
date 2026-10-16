import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerDetalle, registrarDiagnostico, cambiarEstado, registrarSeguimiento } from "../api/tickets";
import { crearCotizacion, decidirCotizacion } from "../api/cotizaciones";
import { generarFactura, pagarFactura } from "../api/facturas";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET, ETIQUETA_ESTADO, ETIQUETA_CANAL } from "../constants/tickets";
import { ESTADOS_COTIZACION, ESTADOS_FACTURA } from "../constants/cotizaciones";
import {
    codigoCotizacion,
    codigoFactura,
    codigoTicket,
    formatearFecha,
    formatearFechaHora,
    formatearMonto,
} from "../utils/formato";
import { proximoPaso, leToca } from "../utils/ciclo";
import ProgresoCiclo from "../components/ProgresoCiclo";
import Insignia from "../components/Insignia";
import FormularioDiagnostico from "../components/FormularioDiagnostico";
import CambioEstado from "../components/CambioEstado";
import PanelActividad from "../components/PanelActividad";
import EditorCotizacion from "../components/EditorCotizacion";
import { SeccionCotizaciones } from "../components/Cotizacion";
import DecisionCotizacion from "../components/DecisionCotizacion";
import Factura from "../components/Factura";
import ConfirmarFactura from "../components/ConfirmarFactura";
import FormularioPago from "../components/FormularioPago";
import DocumentoImprimible from "../components/DocumentoImprimible";
import AvisoFlotante from "../components/AvisoFlotante";
import { EsqueletoDetalle } from "../components/Esqueleto";
import MigasDePan from "../components/MigasDePan";
import "./TicketDetalle.css";

const Dato = ({ etiqueta, children }) => (
    <div className="detalle-dato">
        <dt>{etiqueta}</dt>
        <dd>{children}</dd>
    </div>
);

// Detalle de un ticket en una sola pantalla. A la izquierda lo que se sabe
// del caso (problema, equipo, diagnostico, cotizacion, factura); a la
// derecha, fijo, el panel de actividad con el registro tipo chat.
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

    // los formularios que se abren desde el aviso del proximo paso viven en
    // su tarjeta: se lleva la vista hasta ahi para que no queden fuera
    useEffect(() => {
        if (!editando) return;
        document.getElementById(`seccion-${editando}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [editando]);

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

    // el listado se llama distinto para el cliente, igual que en su pantalla
    const listado = sesion.usuario.rol === ROLES.CLIENTE ? "Mis tickets" : "Tickets";

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
                <MigasDePan elementos={[{ etiqueta: listado, ruta: "/tickets" }, { etiqueta: "Ticket no encontrado" }]} />
                <div className="aviso aviso-error" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    if (!detalle) {
        return (
            <div className="pagina detalle-pagina">
                <EsqueletoDetalle />
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
    const esCliente = sesion.usuario.rol === ROLES.CLIENTE;

    // ficha tecnica del equipo: solo lo que se cargo, para no llenar de guiones
    const fichaEquipo = [
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

    // Aviso del proximo paso: lo que hay que hacer ahora, con un solo boton
    // principal. Las acciones son las mismas de cada tarjeta, solo que aca
    // quedan arriba en vez de a mitad de la pagina.
    const paso = proximoPaso(
        {
            ...ticket,
            factura_estado: factura?.estado,
            factura_total: factura?.total,
            cotizacion_pendiente_total: pendiente?.total,
        },
        sesion.usuario.rol
    );
    let acciones = [];
    if (puedeDecidir) {
        acciones = [
            { etiqueta: "Rechazar", secundaria: true, abrir: ESTADOS_COTIZACION.RECHAZADA },
            { etiqueta: "Aprobar cotización", abrir: ESTADOS_COTIZACION.APROBADA },
        ];
    } else if (puedePagar) {
        acciones = [{ etiqueta: "Pagar en línea", abrir: "pago" }];
    } else if (puedeEditar && !diagnostico && [ROLES.TECNICO, ROLES.ADMINISTRADOR].includes(sesion.usuario.rol)) {
        paso.texto = "Registra el diagnóstico: sin él no se puede cotizar.";
        acciones = [{ etiqueta: "Registrar diagnóstico", abrir: "diagnostico" }];
    } else if (puedeCotizar) {
        paso.texto = cotizaciones.length > 0
            ? "El cliente rechazó la cotización anterior. Prepara una nueva."
            : "El diagnóstico está listo. Prepara la cotización para el cliente.";
        acciones = [{ etiqueta: "Crear cotización", abrir: "cotizacion" }];
    } else if (puedeFacturar) {
        acciones = [{ etiqueta: "Generar factura", abrir: "factura" }];
    } else if (puedeCambiarEstado && leToca(paso, sesion.usuario.rol)) {
        acciones = [{ etiqueta: "Cambiar estado", abrir: "estado" }];
    }
    const pasoUrgente = acciones.length > 0;

    return (
        <div className={`pagina detalle-pagina${imprimiendo ? " no-imprimir" : ""}`}>
            <MigasDePan
                elementos={[{ etiqueta: listado, ruta: "/tickets" }, { etiqueta: `${codigoTicket(ticket.id_ticket)} · ${ticket.titulo}` }]}
            />

            <div className="pagina-cabecera detalle-cabecera">
                <div className="detalle-cabecera-texto">
                    <span className="detalle-codigo etiqueta-codigo">{codigoTicket(ticket.id_ticket)}</span>
                    <h1>{ticket.titulo}</h1>
                    <div className="detalle-insignias">
                        <Insignia tipo="estado" valor={ticket.estado} />
                        {/* la prioridad es una decision interna del taller */}
                        {!esCliente && <Insignia tipo="prioridad" valor={ticket.prioridad} />}
                        <Insignia tipo="categoria" valor={ticket.categoria} />
                    </div>
                </div>
                {/* si el aviso del proximo paso ya ofrece cambiar el estado, no se repite */}
                {puedeCambiarEstado && !acciones.some((a) => a.abrir === "estado") && (
                    <button
                        type="button"
                        className="boton boton-secundario no-imprimir"
                        onClick={() => abrirEdicion("estado")}
                    >
                        Cambiar estado
                    </button>
                )}
            </div>

            <div className={`tarjeta detalle-paso no-imprimir${pasoUrgente ? " detalle-paso-urgente" : ""}`}>
                <ProgresoCiclo estado={ticket.estado} />
                <div className="detalle-paso-fila" role={pasoUrgente ? "status" : undefined}>
                    <div>
                        <span className="detalle-paso-titulo">{pasoUrgente ? "Te toca" : "Próximo paso"}</span>
                        <p>{paso.texto}</p>
                    </div>
                    {acciones.length > 0 && (
                        <div className="detalle-paso-acciones">
                            {acciones.map((accion) => (
                                <button
                                    key={accion.abrir}
                                    type="button"
                                    className={`boton${accion.secundaria ? " boton-secundario" : ""}`}
                                    onClick={() => abrirEdicion(accion.abrir)}
                                >
                                    {accion.etiqueta}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AvisoFlotante mensaje={aviso} onCerrar={() => setAviso("")} />

            <div className="detalle-columnas">
                <div className="detalle-principal">
                    <div className="tarjeta">
                        <h2>Problema reportado</h2>
                        <p className="detalle-texto">{ticket.descripcion}</p>
                        <dl className="detalle-resumen">
                            <Dato etiqueta="Equipo">
                                {ticket.equipo_tipo} {ticket.equipo_marca} {ticket.equipo_modelo}
                            </Dato>
                            <Dato etiqueta="Número de serie">
                                <span className="detalle-serie">{ticket.equipo_numero_serie}</span>
                            </Dato>
                            {esTaller && <Dato etiqueta="Cliente">{ticket.cliente}</Dato>}
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
                            <Dato etiqueta="Encendía al recibirlo">
                                {ticket.enciende_al_recibir === null ? "No se probó" : ticket.enciende_al_recibir ? "Sí" : "No"}
                            </Dato>
                            <Dato etiqueta="Contraseña del equipo">
                                {ticket.dejo_contrasena ? (esTaller ? "La dejó (ver notas internas)" : "La dejaste") : "No la dejó"}
                            </Dato>
                            {ticket.condicion_fisica && (
                                <div className="detalle-dato detalle-dato-ancho">
                                    <dt>Estado físico</dt>
                                    <dd className="detalle-texto">{ticket.condicion_fisica}</dd>
                                </div>
                            )}
                        </dl>

                        {fichaEquipo.length > 0 && (
                            <>
                                <h3 className="detalle-subtitulo">Ficha del equipo</h3>
                                <dl className="detalle-resumen detalle-resumen-sin-linea">
                                    {fichaEquipo.map(([etiqueta, valor]) => (
                                        <Dato key={etiqueta} etiqueta={etiqueta}>
                                            {valor}
                                        </Dato>
                                    ))}
                                </dl>
                            </>
                        )}
                    </div>

                    <div className="tarjeta" id="seccion-diagnostico">
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
                        <div className="tarjeta" id="seccion-cotizacion">
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
                            ) : factura && aprobada ? (
                                // con factura emitida la cotizacion repite las mismas lineas:
                                // queda plegada para no duplicar la tabla
                                <details className="detalle-plegable">
                                    <summary>
                                        Aprobada por {formatearMonto(aprobada.total)} · ver detalle
                                    </summary>
                                    <SeccionCotizaciones cotizaciones={cotizaciones} vacio="" />
                                </details>
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

                </div>

                <aside className="detalle-lateral" aria-label="Actividad del ticket">
                    <PanelActividad
                        actualizaciones={detalle.actualizaciones}
                        notas={esTaller ? detalle.notas_privadas : null}
                        idUsuario={sesion.usuario.id_usuario}
                        puedeEscribir={puedeEditar}
                        guardando={guardando && editando === "seguimiento"}
                        error={editando === "seguimiento" ? errorAccion : ""}
                        onEnviar={(tipo, texto, imagenes) => {
                            setEditando("seguimiento");
                            return ejecutar(
                                () => registrarSeguimiento(token, ticket.id_ticket, tipo, texto, imagenes),
                                tipo === "notas" ? "Nota interna registrada." : "Avance enviado al cliente."
                            );
                        }}
                    />
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
