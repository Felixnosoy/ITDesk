import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registrarDiagnostico, cambiarEstado, registrarSeguimiento } from "../api/tickets";
import { crearCotizacion, decidirCotizacion } from "../api/cotizaciones";
import { generarFactura, pagarFactura } from "../api/facturas";
import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET, ETIQUETA_ESTADO } from "../constants/tickets";
import { ESTADOS_COTIZACION } from "../constants/cotizaciones";
import { codigoTicket } from "../utils/formato";
import { permisosDe, proximoPasoDetalle } from "../utils/permisosTicket";
import { marcarVisto } from "../utils/novedades";
import { esAtajoLibre } from "../utils/teclado";
import useTicketDetalle from "../hooks/useTicketDetalle";
import Insignia from "../components/Insignia";
import CambioEstado from "../components/CambioEstado";
import PanelActividad from "../components/PanelActividad";
import DecisionCotizacion from "../components/DecisionCotizacion";
import ConfirmarFactura from "../components/ConfirmarFactura";
import FormularioPago from "../components/FormularioPago";
import AvisoFlotante from "../components/AvisoFlotante";
import { EsqueletoDetalle } from "../components/Esqueleto";
import MigasDePan from "../components/MigasDePan";
import AvisoProximoPaso from "../components/detalle/AvisoProximoPaso";
import ResumenTicket from "../components/detalle/ResumenTicket";
import SeccionDiagnostico from "../components/detalle/SeccionDiagnostico";
import SeccionCotizacion from "../components/detalle/SeccionCotizacion";
import SeccionFactura from "../components/detalle/SeccionFactura";
import DocumentosImprimibles from "../components/detalle/DocumentosImprimibles";
import "./TicketDetalle.css";

// Detalle de un ticket en una sola pantalla. A la izquierda lo que se sabe
// del caso (problema, equipo, diagnostico, cotizacion, factura); a la
// derecha, fijo, el panel de actividad con el registro tipo chat.
//
// La pagina solo arma las piezas: el estado y las acciones viven en
// useTicketDetalle, las reglas de quien puede que en utils/permisosTicket y
// cada tarjeta en components/detalle.
export default function TicketDetalle() {
    const { id } = useParams();
    const location = useLocation();
    const { sesion } = useAuth();
    const { token, usuario } = sesion;
    const { rol } = usuario;

    const {
        detalle,
        error,
        aviso,
        cerrarAviso,
        editando,
        abrirEdicion,
        cerrarEdicion,
        guardando,
        errorAccion,
        ejecutar,
    } = useTicketDetalle(token, id, location.state?.aviso ?? "");

    // documento que se esta imprimiendo ("cotizacion" o "factura")
    const [imprimiendo, setImprimiendo] = useState(null);
    // pedido de escribir en un canal del panel, desde los atajos de teclado
    const [pedidoCaja, setPedidoCaja] = useState(null);

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

    // atajos del detalle: A avance para el cliente, N nota interna, E estado
    useEffect(() => {
        if (!detalle) return undefined;
        const { puedeEditar, puedeCambiarEstado } = permisosDe(detalle, rol);
        const acciones = {
            ...(puedeEditar && {
                a: () => setPedidoCaja({ canal: "publico", vez: Date.now() }),
                n: () => setPedidoCaja({ canal: "interno", vez: Date.now() }),
            }),
            ...(puedeCambiarEstado && { e: () => abrirEdicion("estado") }),
        };

        const alPresionar = (evento) => {
            const accion = esAtajoLibre(evento) && acciones[evento.key.toLowerCase()];
            if (!accion) return;
            evento.preventDefault();
            accion();
        };
        document.addEventListener("keydown", alPresionar);
        return () => document.removeEventListener("keydown", alPresionar);
    }, [detalle, rol, abrirEdicion]);

    // lo que se ve ahora deja de contar como novedad en el listado
    useEffect(() => {
        if (!detalle) return;
        marcarVisto(usuario.id_usuario, detalle.ticket.id_ticket, [
            detalle.ticket.fecha_apertura,
            ...detalle.actualizaciones.map((a) => a.fecha),
            ...(detalle.notas_privadas ?? []).map((n) => n.fecha),
        ]);
    }, [detalle, usuario.id_usuario]);

    // el listado se llama distinto para el cliente, igual que en su pantalla
    const listado = rol === ROLES.CLIENTE ? "Mis tickets" : "Tickets";

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

    const { ticket, diagnostico, factura } = detalle;
    const permisos = permisosDe(detalle, rol);
    const { esTaller, esCliente, puedeEditar, puedeCambiarEstado, pendiente, aprobada } = permisos;
    const paso = proximoPasoDetalle(detalle, rol, permisos);
    const idTicket = ticket.id_ticket;

    // el aviso dice en que quedo el ticket, que es lo que le importa al cliente
    const decidir = (datos) =>
        ejecutar(
            () => decidirCotizacion(token, idTicket, pendiente.id_cotizacion, datos),
            datos.estado === ESTADOS_COTIZACION.APROBADA
                ? `Aprobaste la cotización. Tu ticket pasó a "${ETIQUETA_ESTADO[ESTADOS_TICKET.EN_REPARACION]}".`
                : `Rechazaste la cotización. Tu ticket volvió a "${ETIQUETA_ESTADO[ESTADOS_TICKET.EN_DIAGNOSTICO]}" y el técnico puede prepararte otra.`
        );

    return (
        <div className={`pagina detalle-pagina${imprimiendo ? " no-imprimir" : ""}`}>
            <MigasDePan
                elementos={[{ etiqueta: listado, ruta: "/tickets" }, { etiqueta: `${codigoTicket(idTicket)} · ${ticket.titulo}` }]}
            />

            <div className="pagina-cabecera detalle-cabecera">
                <div className="detalle-cabecera-texto">
                    <span className="detalle-codigo etiqueta-codigo">{codigoTicket(idTicket)}</span>
                    <h1>{ticket.titulo}</h1>
                    <div className="detalle-insignias">
                        <Insignia tipo="estado" valor={ticket.estado} />
                        {/* la prioridad es una decision interna del taller */}
                        {!esCliente && <Insignia tipo="prioridad" valor={ticket.prioridad} />}
                        <Insignia tipo="categoria" valor={ticket.categoria} />
                    </div>
                </div>
                {/* si el aviso del proximo paso ya ofrece cambiar el estado, no se repite */}
                {puedeCambiarEstado && !paso.acciones.some((a) => a.abrir === "estado") && (
                    <button type="button" className="boton boton-secundario no-imprimir" onClick={() => abrirEdicion("estado")}>
                        Cambiar estado
                    </button>
                )}
            </div>

            <AvisoProximoPaso estado={ticket.estado} paso={paso} onAccion={abrirEdicion} />

            <AvisoFlotante mensaje={aviso} onCerrar={cerrarAviso} />

            <div className="detalle-columnas">
                <div className="detalle-principal">
                    <ResumenTicket ticket={ticket} esTaller={esTaller} />

                    <SeccionDiagnostico
                        diagnostico={diagnostico}
                        esTaller={esTaller}
                        puedeEditar={puedeEditar}
                        editando={editando === "diagnostico"}
                        guardando={guardando}
                        error={errorAccion}
                        onEditar={() => abrirEdicion("diagnostico")}
                        onCancelar={cerrarEdicion}
                        onGuardar={(valores) =>
                            ejecutar(
                                () => registrarDiagnostico(token, idTicket, valores),
                                diagnostico ? "Diagnóstico actualizado." : "Diagnóstico registrado."
                            )
                        }
                    />

                    {permisos.mostrarCotizacion && (
                        <SeccionCotizacion
                            permisos={permisos}
                            hayFactura={Boolean(factura)}
                            editando={editando === "cotizacion"}
                            guardando={guardando}
                            error={errorAccion}
                            onImprimir={() => setImprimiendo("cotizacion")}
                            onCrear={() => abrirEdicion("cotizacion")}
                            onDecidir={abrirEdicion}
                            onCancelar={cerrarEdicion}
                            onGuardar={(valores) =>
                                ejecutar(
                                    () => crearCotizacion(token, idTicket, valores),
                                    "Cotización enviada. El ticket queda esperando la aprobación del cliente."
                                )
                            }
                        />
                    )}

                    {permisos.mostrarFactura && (
                        <SeccionFactura
                            factura={factura}
                            puedeFacturar={permisos.puedeFacturar}
                            puedePagar={permisos.puedePagar}
                            onImprimir={() => setImprimiendo("factura")}
                            onGenerar={() => abrirEdicion("factura")}
                            onPagar={() => abrirEdicion("pago")}
                        />
                    )}
                </div>

                <aside className="detalle-lateral" aria-label="Actividad del ticket">
                    <PanelActividad
                        actualizaciones={detalle.actualizaciones}
                        notas={esTaller ? detalle.notas_privadas : null}
                        idUsuario={usuario.id_usuario}
                        puedeEscribir={puedeEditar}
                        guardando={guardando && editando === "seguimiento"}
                        error={editando === "seguimiento" ? errorAccion : ""}
                        pedido={pedidoCaja}
                        onEnviar={(tipo, texto, imagenes) => {
                            abrirEdicion("seguimiento");
                            return ejecutar(
                                () => registrarSeguimiento(token, idTicket, tipo, texto, imagenes),
                                tipo === "notas" ? "Nota interna registrada." : "Avance enviado al cliente."
                            );
                        }}
                    />
                </aside>
            </div>

            {permisos.puedeDecidir && [ESTADOS_COTIZACION.APROBADA, ESTADOS_COTIZACION.RECHAZADA].includes(editando) && (
                <DecisionCotizacion
                    cotizacion={pendiente}
                    decision={editando}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={cerrarEdicion}
                    onConfirmar={decidir}
                />
            )}

            {permisos.puedeFacturar && editando === "factura" && (
                <ConfirmarFactura
                    cotizacion={aprobada}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={cerrarEdicion}
                    onConfirmar={() =>
                        ejecutar(() => generarFactura(token, idTicket), "Factura generada. Ya se puede pasar el ticket a Resuelto.")
                    }
                />
            )}

            {permisos.puedePagar && editando === "pago" && (
                <FormularioPago
                    factura={factura}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={cerrarEdicion}
                    onPagar={(datos) =>
                        ejecutar(() => pagarFactura(token, idTicket, datos), "Pago recibido. Tu factura quedó pagada.")
                    }
                />
            )}

            {editando === "estado" && (
                <CambioEstado
                    estadoActual={ticket.estado}
                    siguientes={detalle.estados_siguientes}
                    tieneDiagnostico={Boolean(diagnostico)}
                    tieneFactura={Boolean(factura)}
                    guardando={guardando}
                    error={errorAccion}
                    onCerrar={cerrarEdicion}
                    onGuardar={(datos) => ejecutar(() => cambiarEstado(token, idTicket, datos), "Estado actualizado.")}
                />
            )}

            <DocumentosImprimibles
                imprimiendo={imprimiendo}
                ticket={ticket}
                cotizacion={permisos.cotizaciones[0]}
                factura={factura}
            />
        </div>
    );
}
