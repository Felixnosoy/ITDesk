const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ticketService = require("./ticket.service");
const diagnosticoService = require("./diagnostico.service");
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

// Fechas que acompañan al cambio de estado. fecha_resolucion se pone al
// pasar a Resuelto y se borra si el ticket vuelve a reparacion (el
// problema no estaba resuelto); fecha_cierre se pone al cerrar. Solo SQL
// fijo, sin datos del usuario.
const fechasPorEstado = (nuevo) => {
    if (nuevo === RESUELTO) return "fecha_resolucion = NOW()";
    if (nuevo === CERRADO) return "fecha_cierre = NOW()";
    return "fecha_resolucion = NULL";
};

// Cambia el estado del ticket siguiendo TRANSICIONES y lo deja anotado en
// la linea de tiempo (actualizacion de tipo Estado), en una transaccion.
const cambiarEstado = async (idTicket, datos = {}, usuario) => {
    const observaciones = validarTextoOpcional(datos.observaciones, "observaciones");
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    const nuevo = datos.estado;

    validarTransicion(ticket.estado, nuevo);

    // sin diagnostico no hay nada que cotizar ni que el cliente apruebe
    if (nuevo === ESPERANDO_APROBACION) {
        const diagnostico = await diagnosticoService.obtenerDiagnosticoDeTicket(ticket.id_ticket);

        if (!diagnostico) {
            throw crearError("El ticket necesita un diagnóstico antes de pasar a Esperando aprobacion.", 400);
        }
    }

    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();

        await conexion.query(
            `UPDATE ticket SET estado = ?, ${fechasPorEstado(nuevo)} WHERE id_ticket = ?`,
            [nuevo, ticket.id_ticket]
        );

        await conexion.query(
            `
            INSERT INTO actualizacion (id_ticket, id_usuario, tipo, estado, observaciones)
            VALUES (?, ?, ?, ?, ?)
            `,
            [ticket.id_ticket, usuario.id_usuario, TIPOS_ACTUALIZACION.ESTADO, nuevo, observaciones]
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
