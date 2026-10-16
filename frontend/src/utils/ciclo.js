import { ROLES } from "../constants/roles";
import { ESTADOS_TICKET } from "../constants/tickets";
import { ESTADOS_FACTURA } from "../constants/cotizaciones";
import { formatearMonto } from "./formato";

// Etapas del ciclo de un ticket tal como las lee una persona, en el mismo
// orden que ESTADOS_TICKET. La barra de progreso y los inicios por rol
// salen de aca, asi todas las pantallas cuentan la misma historia.
export const PASOS_CICLO = [
    { estado: ESTADOS_TICKET.ABIERTO, etiqueta: "Recibido" },
    { estado: ESTADOS_TICKET.EN_DIAGNOSTICO, etiqueta: "Diagnóstico" },
    { estado: ESTADOS_TICKET.ESPERANDO_APROBACION, etiqueta: "Aprobación" },
    { estado: ESTADOS_TICKET.EN_REPARACION, etiqueta: "Reparación" },
    { estado: ESTADOS_TICKET.RESUELTO, etiqueta: "Listo" },
    { estado: ESTADOS_TICKET.CERRADO, etiqueta: "Entregado" },
];

export const indicePaso = (estado) => PASOS_CICLO.findIndex((paso) => paso.estado === estado);

// quien tiene que mover el ticket en cada momento
export const RESPONSABLE = {
    CLIENTE: "cliente",
    TALLER: "taller",
    RECEPCION: "recepcion",
    NADIE: "nadie",
};

const ROLES_TALLER = [ROLES.TECNICO, ROLES.ADMINISTRADOR];

// Proximo paso de un ticket a partir de los campos del listado (estado,
// factura_estado, factura_total, cotizacion_pendiente_total). Devuelve el
// texto para el rol que mira y quien tiene que actuar.
export function proximoPaso(ticket, rol) {
    const esCliente = rol === ROLES.CLIENTE;
    const facturaPendiente = ticket.factura_estado === ESTADOS_FACTURA.PENDIENTE;
    const montoFactura = formatearMonto(ticket.factura_total);

    switch (ticket.estado) {
        case ESTADOS_TICKET.ABIERTO:
            return {
                responsable: RESPONSABLE.TALLER,
                texto: esCliente ? "Recibimos tu equipo; el técnico lo revisará pronto." : "Revisar el equipo y empezar el diagnóstico.",
            };
        case ESTADOS_TICKET.EN_DIAGNOSTICO:
            return {
                responsable: RESPONSABLE.TALLER,
                texto: esCliente ? "El técnico está revisando tu equipo." : "Registrar el diagnóstico y preparar la cotización.",
            };
        case ESTADOS_TICKET.ESPERANDO_APROBACION:
            return {
                responsable: RESPONSABLE.CLIENTE,
                texto: esCliente
                    ? `Aprueba o rechaza la cotización de ${formatearMonto(ticket.cotizacion_pendiente_total)}.`
                    : "Esperando que el cliente apruebe la cotización.",
            };
        case ESTADOS_TICKET.EN_REPARACION:
            if (facturaPendiente) {
                return esCliente
                    ? { responsable: RESPONSABLE.CLIENTE, texto: `Tienes una factura de ${montoFactura} pendiente de pago.` }
                    : { responsable: RESPONSABLE.TALLER, texto: "Factura emitida: pasar a Resuelto cuando termine la reparación." };
            }
            return {
                responsable: RESPONSABLE.TALLER,
                texto: esCliente ? "Estamos reparando tu equipo." : ticket.factura_estado ? "Terminar la reparación y marcarlo como resuelto." : "Terminar la reparación y generar la factura.",
            };
        case ESTADOS_TICKET.RESUELTO:
            if (facturaPendiente) {
                return esCliente
                    ? { responsable: RESPONSABLE.CLIENTE, texto: `Tu equipo está listo. Paga la factura de ${montoFactura} y retíralo.` }
                    : { responsable: RESPONSABLE.RECEPCION, texto: `Cobrar ${montoFactura} y entregar el equipo.` };
            }
            return {
                responsable: RESPONSABLE.RECEPCION,
                texto: esCliente ? "Tu equipo está listo para retirar en el taller." : "Entregar el equipo y cerrar el ticket.",
            };
        default:
            return { responsable: RESPONSABLE.NADIE, texto: esCliente ? "Entregado. Gracias por confiar en el taller." : "Ticket cerrado." };
    }
}

// si el proximo paso le toca al rol que mira
export function leToca(paso, rol) {
    if (paso.responsable === RESPONSABLE.CLIENTE) return rol === ROLES.CLIENTE;
    if (paso.responsable === RESPONSABLE.TALLER) return ROLES_TALLER.includes(rol);
    if (paso.responsable === RESPONSABLE.RECEPCION) return [ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR].includes(rol);
    return false;
}
