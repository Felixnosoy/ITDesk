const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service");

// Una calificacion por ticket (UQ_Encuesta_Ticket), solo el dueño del
// ticket puede calificarlo, y solo despues de Cerrado — no tiene sentido
// pedir satisfaccion sobre una reparacion que todavia esta en curso.

const COLUMNAS_ENCUESTA = `
    e.id_encuesta,
    e.id_ticket,
    e.id_usuario,
    e.calificacion,
    e.comentario,
    e.fecha
`;

const JOIN_ENCUESTA = `
    FROM encuesta_satisfaccion e
`;

const crearEncuesta = async ({ id_ticket, id_usuario, calificacion, comentario }) => {
    if (!id_ticket || !id_usuario || !calificacion) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const calificacionNumerica = Number(calificacion);
    if (!Number.isInteger(calificacionNumerica) || calificacionNumerica < 1 || calificacionNumerica > 5) {
        throw crearError("La calificación debe ser un número entero entre 1 y 5.", 400);
    }

    const ticket = await ticketService.obtenerTicketPorId(id_ticket);

    if (Number(ticket.id_usuario) !== Number(id_usuario)) {
        throw crearError("No tenés permisos para calificar este ticket.", 403);
    }

    if (ticket.estado !== "Cerrado") {
        throw crearError("Solo se puede calificar un ticket ya cerrado.", 409);
    }

    const [existente] = await pool.query(
        "SELECT id_encuesta FROM encuesta_satisfaccion WHERE id_ticket = ?",
        [id_ticket]
    );

    if (existente.length > 0) {
        throw crearError("Este ticket ya fue calificado.", 409);
    }

    const comentarioNormalizado = comentario?.trim() || null;

    const [resultado] = await pool.query(
        `
        INSERT INTO encuesta_satisfaccion (id_ticket, id_usuario, calificacion, comentario)
        VALUES (?, ?, ?, ?)
        `,
        [id_ticket, id_usuario, calificacionNumerica, comentarioNormalizado]
    );

    const [encuestas] = await pool.query(
        `
        SELECT ${COLUMNAS_ENCUESTA}
        ${JOIN_ENCUESTA}
        WHERE e.id_encuesta = ?
        `,
        [resultado.insertId]
    );

    return encuestas[0];
};

const obtenerEncuestaPorTicket = async (id_ticket) => {
    const [encuestas] = await pool.query(
        `
        SELECT ${COLUMNAS_ENCUESTA}
        ${JOIN_ENCUESTA}
        WHERE e.id_ticket = ?
        `,
        [id_ticket]
    );

    return encuestas[0] || null;
};

// version "propia" del cliente: mismo chequeo de dueño que el resto del
// sistema (archivo.service.js, cotizacion.service.js) usa para /mis/:id
const obtenerMiEncuestaPorTicket = async (id_ticket, id_usuario_solicitante) => {
    const ticket = await ticketService.obtenerTicketPorId(id_ticket);

    if (Number(ticket.id_usuario) !== Number(id_usuario_solicitante)) {
        throw crearError("No tenés permisos para ver esta información.", 403);
    }

    return obtenerEncuestaPorTicket(id_ticket);
};

// para el resumen de reportes (Admin) — todas las calificaciones
const obtenerEncuestas = async () => {
    const [encuestas] = await pool.query(`
        SELECT ${COLUMNAS_ENCUESTA}
        ${JOIN_ENCUESTA}
        ORDER BY e.id_encuesta DESC
    `);

    return encuestas;
};

module.exports = {
    crearEncuesta,
    obtenerEncuestaPorTicket,
    obtenerMiEncuestaPorTicket,
    obtenerEncuestas
};
