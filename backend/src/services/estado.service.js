const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ticketService = require("./ticket.service");
const diagnosticoService = require("./diagnostico.service");
const cotizacionService = require("./cotizacion.service");
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");
const { TIPOS_ACTUALIZACION } = require("./seguimiento.service");
const { validarTextoOpcional } = require("../validators/comun.validator");

const {
    ABIERTO,
    EN_DIAGNOSTICO,
    ESPERANDO_APROBACION,
    EN_REPARACION,
    RESUELTO,
    CERRADO
} = ESTADOS_TICKET;

// Ciclo de vida del ticket (issue HU13.1): a que estados se puede pasar
// desde cada uno. Esperando aprobacion puede volver a diagnostico si el
// cliente rechaza la cotizacion; Resuelto puede volver a reparacion si el
// problema reaparece; Cerrado es final.
const TRANSICIONES = {
    [ABIERTO]: [EN_DIAGNOSTICO],
    [EN_DIAGNOSTICO]: [ESPERANDO_APROBACION, EN_REPARACION, RESUELTO],
    [ESPERANDO_APROBACION]: [EN_REPARACION, EN_DIAGNOSTICO],
    [EN_REPARACION]: [RESUELTO],
    [RESUELTO]: [CERRADO, EN_REPARACION],
    [CERRADO]: []
};

const estadosSiguientes = (estado) => TRANSICIONES[estado] ?? [];

const validarTransicion = (actual, nuevo) => {
    if (typeof nuevo !== "string" || !Object.values(ESTADOS_TICKET).includes(nuevo)) {
        throw crearError(
            `El campo estado debe ser uno de: ${Object.values(ESTADOS_TICKET).join(", ")}.`,
            400
        );
    }

    if (actual === CERRADO) {
        throw crearError("El ticket está cerrado y ya no cambia de estado.", 400);
    }

    if (actual === nuevo) {
        throw crearError(`El ticket ya está en ${nuevo}.`, 400);
    }

    const permitidos = estadosSiguientes(actual);

    if (!permitidos.includes(nuevo)) {
        throw crearError(
            `No se puede pasar de ${actual} a ${nuevo}. Desde ${actual} se puede pasar a: ${permitidos.join(", ")}.`,
            400
        );
    }
};

// Campos que acompañan al cambio de estado. fecha_resolucion se pone al
// pasar a Resuelto y se borra si el ticket vuelve a reparacion (el
// problema no estaba resuelto), igual que la excepcion sin costo;
// fecha_cierre se pone al cerrar. Solo SQL fijo, sin datos del usuario.
const camposPorEstado = (nuevo, sinCosto) => {
    if (nuevo === RESUELTO) {
        return `fecha_resolucion = NOW(), resuelto_sin_costo = ${sinCosto ? 1 : 0}`;
    }
    if (nuevo === CERRADO) return "fecha_cierre = NOW()";
    return "fecha_resolucion = NULL, resuelto_sin_costo = 0";
};

// Cotizacion aprobada y facturada del ticket. La facturacion todavia no
// existe (llega con HU16): hasta entonces ningun ticket la tiene y la unica
// forma de resolver es declarar la excepcion sin costo.
const tieneCotizacionFacturada = async () => false;

// sin_costo es opcional, pero si viene tiene que ser booleano: un "si" o un
// 1 mal enviados no deben poder saltarse la regla de cierre
const validarSinCosto = (valor) => {
    if (valor === undefined) return false;

    if (typeof valor !== "boolean") {
        throw crearError("El campo sin_costo debe ser true o false.", 400);
    }

    return valor;
};

// Cambia el estado del ticket siguiendo TRANSICIONES y lo deja anotado en
// la linea de tiempo (actualizacion de tipo Estado), en una transaccion.
const cambiarEstado = async (idTicket, datos = {}, usuario) => {
    const observaciones = validarTextoOpcional(datos.observaciones, "observaciones");
    const sinCosto = validarSinCosto(datos.sin_costo);
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    const nuevo = datos.estado;

    validarTransicion(ticket.estado, nuevo);

    // regla de cierre (issue HU13.2)
    if (nuevo === RESUELTO && !sinCosto && !(await tieneCotizacionFacturada(ticket.id_ticket))) {
        throw crearError(
            "No se puede marcar como Resuelto sin una cotización aprobada y facturada. Si el trabajo no tuvo costo, decláralo como trabajo sin costo.",
            400
        );
    }

    // la excepcion queda escrita en la linea de tiempo que ve el cliente
    const esResueltoSinCosto = nuevo === RESUELTO && sinCosto;
    const nota = esResueltoSinCosto
        ? [observaciones, "Resuelto sin costo."].filter(Boolean).join(" ")
        : observaciones;

    // con una cotizacion pendiente el ticket sale de Esperando aprobacion
    // solo por la decision del cliente (issue HU15), no a mano
    if (ticket.estado === ESPERANDO_APROBACION) {
        const vigente = await cotizacionService.obtenerCotizacionVigente(ticket.id_ticket);

        if (vigente?.estado === ESTADOS_COTIZACION.PENDIENTE) {
            throw crearError("La cotización está esperando la decisión del cliente. El ticket cambia de estado cuando el cliente la apruebe o la rechace.", 400);
        }
    }

    // sin diagnostico no hay nada que cotizar ni que el cliente apruebe
    if (nuevo === ESPERANDO_APROBACION) {
        const diagnostico = await diagnosticoService.obtenerDiagnosticoDeTicket(ticket.id_ticket);

        if (!diagnostico) {
            throw crearError("El ticket necesita un diagnóstico antes de pasar a Esperando aprobación.", 400);
        }
    }

    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        await conexion.query(
            `UPDATE ticket SET estado = ?, ${camposPorEstado(nuevo, esResueltoSinCosto)} WHERE id_ticket = ?`,
            [nuevo, ticket.id_ticket]
        );

        await conexion.query(
            `
            INSERT INTO actualizacion (id_ticket, id_usuario, tipo, estado, observaciones)
            VALUES (?, ?, ?, ?, ?)
            `,
            [ticket.id_ticket, usuario.id_usuario, TIPOS_ACTUALIZACION.ESTADO, nuevo, nota]
        );

        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }

    return {
        anterior: ticket.estado,
        ticket: await ticketService.obtenerTicketPorId(ticket.id_ticket)
    };
};

module.exports = {
    TRANSICIONES,
    estadosSiguientes,
    cambiarEstado
};
