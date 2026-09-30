const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ticketService = require("./ticket.service");
const { validarTexto } = require("../validators/comun.validator");

// Seguimiento del ticket: actualizaciones publicas (las ve el cliente) y
// notas privadas (solo el taller).

const TIPOS_ACTUALIZACION = {
    AVANCE: "Avance",
    ESTADO: "Estado"
};

const COLUMNAS_ACTUALIZACION = `
    a.id_actualizacion,
    a.id_ticket,
    a.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    a.tipo,
    a.estado,
    a.observaciones,
    a.fecha
`;

const COLUMNAS_NOTA = `
    n.id_nota,
    n.id_ticket,
    n.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    n.contenido,
    n.fecha
`;

// un ticket cerrado ya no recibe avances ni notas
const obtenerTicketAbierto = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);

    if (ticket.estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket está cerrado y ya no admite novedades.", 400);
    }

    return ticket;
};

const obtenerActualizaciones = async (id_ticket, condicion = "a.id_ticket = ?", parametro = id_ticket) => {
    const [actualizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ACTUALIZACION}
        FROM actualizacion a
        INNER JOIN usuario u
            ON a.id_usuario = u.id_usuario
        WHERE ${condicion}
        ORDER BY a.fecha ASC, a.id_actualizacion ASC
        `,
        [parametro]
    );

    return actualizaciones;
};

const obtenerNotas = async (id_ticket, condicion = "n.id_ticket = ?", parametro = id_ticket) => {
    const [notas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTA}
        FROM nota_privada n
        INNER JOIN usuario u
            ON n.id_usuario = u.id_usuario
        WHERE ${condicion}
        ORDER BY n.fecha ASC, n.id_nota ASC
        `,
        [parametro]
    );

    return notas;
};

// Avance publico escrito por el tecnico. Guarda el estado que tenia el
// ticket en ese momento, para que la linea de tiempo lo muestre.
const crearActualizacion = async (idTicket, datos = {}, usuario) => {
    const observaciones = validarTexto(datos.observaciones, "observaciones");
    const ticket = await obtenerTicketAbierto(idTicket, usuario);

    const [resultado] = await pool.query(
        `
        INSERT INTO actualizacion (id_ticket, id_usuario, tipo, estado, observaciones)
        VALUES (?, ?, ?, ?, ?)
        `,
        [ticket.id_ticket, usuario.id_usuario, TIPOS_ACTUALIZACION.AVANCE, ticket.estado, observaciones]
    );

    const [actualizacion] = await obtenerActualizaciones(null, "a.id_actualizacion = ?", resultado.insertId);

    return actualizacion;
};

// Nota interna del taller: nunca se devuelve al cliente.
const crearNota = async (idTicket, datos = {}, usuario) => {
    const contenido = validarTexto(datos.contenido, "contenido");
    const ticket = await obtenerTicketAbierto(idTicket, usuario);

    const [resultado] = await pool.query(
        `
        INSERT INTO nota_privada (id_ticket, id_usuario, contenido)
        VALUES (?, ?, ?)
        `,
        [ticket.id_ticket, usuario.id_usuario, contenido]
    );

    const [nota] = await obtenerNotas(null, "n.id_nota = ?", resultado.insertId);

    return nota;
};

module.exports = {
    TIPOS_ACTUALIZACION,
    obtenerActualizaciones,
    obtenerNotas,
    crearActualizacion,
    crearNota
};
