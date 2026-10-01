const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ticketService = require("./ticket.service");
const { validarTexto, validarTextoOpcional } = require("../validators/comun.validator");

const COLUMNAS_DIAGNOSTICO = `
    d.id_diagnostico,
    d.id_ticket,
    d.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS tecnico,
    d.diagnostico,
    d.solucion,
    d.observaciones,
    d.fecha_diagnostico,
    d.fecha_edicion
`;

// diagnostico vigente de un ticket, o null si todavia no tiene
const obtenerDiagnosticoDeTicket = async (id_ticket) => {
    const [diagnosticos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DIAGNOSTICO}
        FROM diagnostico d
        INNER JOIN usuario u
            ON d.id_usuario = u.id_usuario
        WHERE d.id_ticket = ?
        `,
        [id_ticket]
    );

    return diagnosticos[0] ?? null;
};

// Registra el diagnostico o, si el ticket ya tiene uno, lo reemplaza: hay
// un solo diagnostico vigente por ticket. Quien lo escribe sale del token.
// Un ticket cerrado ya no se diagnostica.
const registrarDiagnostico = async (idTicket, datos = {}, usuario) => {
    const diagnostico = validarTexto(datos.diagnostico, "diagnostico");
    const solucion = validarTextoOpcional(datos.solucion, "solucion");
    const observaciones = validarTextoOpcional(datos.observaciones, "observaciones");

    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);

    if (ticket.estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket está cerrado y ya no se puede diagnosticar.", 400);
    }

    const existente = await obtenerDiagnosticoDeTicket(ticket.id_ticket);

    if (existente) {
        await pool.query(
            `
            UPDATE diagnostico
            SET
                id_usuario = ?,
                diagnostico = ?,
                solucion = ?,
                observaciones = ?,
                fecha_edicion = NOW()
            WHERE id_diagnostico = ?
            `,
            [usuario.id_usuario, diagnostico, solucion, observaciones, existente.id_diagnostico]
        );
    } else {
        await pool.query(
            `
            INSERT INTO diagnostico (id_ticket, id_usuario, diagnostico, solucion, observaciones)
            VALUES (?, ?, ?, ?, ?)
            `,
            [ticket.id_ticket, usuario.id_usuario, diagnostico, solucion, observaciones]
        );
    }

    return {
        diagnostico: await obtenerDiagnosticoDeTicket(ticket.id_ticket),
        editado: Boolean(existente)
    };
};

module.exports = {
    obtenerDiagnosticoDeTicket,
    registrarDiagnostico
};
