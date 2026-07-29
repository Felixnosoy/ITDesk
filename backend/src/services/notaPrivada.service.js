const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service")
const { verificarStaffExiste } = require("../validators/usuario.validator");

// Notas internas entre Admin/Tecnico — el Cliente nunca tiene acceso a este
// modulo (a diferencia de actualizacion, que es publica). Sin campo estado:
// a diferencia del log publico, una nota privada no representa un cambio de
// estado del ticket, solo un comentario interno.

const COLUMNAS_NOTA = `
    np.id_nota,
    np.id_ticket,
    np.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    np.contenido,
    np.fecha_creacion
`;

const JOIN_NOTA = `
    FROM nota_privada np
    INNER JOIN usuario u
        ON np.id_usuario = u.id_usuario
`;

const crearNota = async (datos) => {
    const { id_ticket, id_usuario, contenido } = datos;

    if (!id_ticket || !id_usuario || !contenido) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const contenidoNormalizado = contenido.trim();

    if (!contenidoNormalizado) {
        throw crearError("El contenido de la nota es requerido.", 400);
    }

    // Verificar que el ticket exista
    await ticketService.obtenerTicketPorId(id_ticket);

    // Verificar que el usuario exista y sea staff
    await verificarStaffExiste(id_usuario);

    const [resultado] = await pool.query(
        `
        INSERT INTO nota_privada (id_ticket, id_usuario, contenido)
        VALUES (?, ?, ?)
        `,
        [id_ticket, id_usuario, contenidoNormalizado]
    );

    const [notas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTA}
        ${JOIN_NOTA}
        WHERE np.id_nota = ?
        `,
        [resultado.insertId]
    );

    return notas[0];
}

// este get sirve para obtener las notas privadas de un ticket en especifico

const obtenerNotasPorTicket = async (id_ticket) => {

    await ticketService.obtenerTicketPorId(id_ticket);

    const [notas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTA}
        ${JOIN_NOTA}
        WHERE np.id_ticket = ?
        ORDER BY np.id_nota ASC
        `,
        [id_ticket]
    );

    return notas;
}

module.exports = {
    crearNota,
    obtenerNotasPorTicket
}
