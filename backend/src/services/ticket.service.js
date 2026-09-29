const pool = require("../config/database");
const ROLES = require("../constants/roles");

const COLUMNAS_TICKET = `
    t.id_ticket,
    t.titulo,
    t.descripcion,
    t.estado,
    t.prioridad,
    t.categoria,
    t.fecha_apertura,
    t.fecha_resolucion,
    t.fecha_cierre,
    t.id_usuario,
    CONCAT(c.nombre, ' ', c.apellido) AS cliente,
    t.id_equipo,
    e.tipo AS equipo_tipo,
    e.marca AS equipo_marca,
    e.modelo AS equipo_modelo,
    e.numero_serie AS equipo_numero_serie,
    a.id_usuario AS id_tecnico,
    CONCAT(tec.nombre, ' ', tec.apellido) AS tecnico
`;

// LEFT JOIN con la asignacion activa: un ticket sin tecnico igual aparece
// en el listado, con id_tecnico y tecnico en null
const JOIN_TICKET = `
    FROM ticket t
    INNER JOIN usuario c
        ON t.id_usuario = c.id_usuario
    INNER JOIN equipo e
        ON t.id_equipo = e.id_equipo
    LEFT JOIN asignacion a
        ON a.id_ticket = t.id_ticket
        AND a.activa = 1
    LEFT JOIN usuario tec
        ON a.id_usuario = tec.id_usuario
`;

// Listado de tickets segun quien consulta: el Cliente solo ve los suyos y
// el personal del taller ve todos. El id del cliente sale del token, nunca
// de un parametro, para que no pueda pedir los tickets de otro.
const obtenerTickets = async (usuario) => {
    const condiciones = [];
    const parametros = [];

    if (usuario.rol === ROLES.CLIENTE) {
        condiciones.push("t.id_usuario = ?");
        parametros.push(usuario.id_usuario);
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(" AND ")}`
        : "";

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        ${where}
        ORDER BY t.fecha_apertura DESC, t.id_ticket DESC
        `,
        parametros
    );

    return tickets;
};

module.exports = {
    obtenerTickets
};
