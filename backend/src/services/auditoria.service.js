const pool = require("../config/database");

// Registro curado de acciones clave, no un log tecnico de cada request —
// cada entrada es una frase legible, escrita por el service/controller que
// disparo la accion (ver los call sites: ticket, usuario, asignacion,
// cotizacion, factura, archivo). Nunca debe poder romper la accion
// principal: si el INSERT falla, se traga el error y sigue.

const COLUMNAS_AUDITORIA = `
    a.id_auditoria,
    a.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    u.rol,
    a.accion,
    a.descripcion,
    a.id_ticket,
    t.fecha_apertura,
    t.titulo AS ticket_titulo,
    a.fecha
`;

// LEFT JOIN (no INNER): hay eventos sin ticket asociado (USUARIO_CREADO,
// CLAVE_RESETEADA, etc.) — con INNER esas filas desaparecerian del todo.
// fecha_apertura hace falta para poder armar Codigos.ticket() en el
// frontend (id_ticket solo no alcanza, ver codigos.js).
const JOIN_AUDITORIA = `
    FROM auditoria a
    INNER JOIN usuario u
        ON a.id_usuario = u.id_usuario
    LEFT JOIN ticket t
        ON a.id_ticket = t.id_ticket
`;

const registrarEvento = async ({ id_usuario, accion, descripcion, id_ticket }) => {
    try {
        await pool.query(
            `
            INSERT INTO auditoria (id_usuario, accion, descripcion, id_ticket)
            VALUES (?, ?, ?, ?)
            `,
            [id_usuario, accion, descripcion, id_ticket || null]
        );
    } catch (error) {
        console.error("No se pudo registrar el evento de auditoría:", error.message);
    }
};

// ultimos 500 eventos — suficiente para una pantalla de auditoria sin
// paginar contra el backend (misma logica client-side que ya usa el resto
// del sistema para listas largas).
const obtenerEventos = async () => {
    const [eventos] = await pool.query(`
        SELECT
            ${COLUMNAS_AUDITORIA}
        ${JOIN_AUDITORIA}
        ORDER BY a.id_auditoria DESC
        LIMIT 500
    `);

    return eventos;
};

module.exports = {
    registrarEvento,
    obtenerEventos
};
