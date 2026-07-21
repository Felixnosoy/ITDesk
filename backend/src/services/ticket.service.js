const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const { verificarClienteExiste, verificarUsuarioExiste } = require("../validators/usuario.validator");

const COLUMNAS_TICKET = `
    t.id_ticket,
    t.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS cliente,
    t.id_equipo,
    e.tipo AS equipo_tipo,
    e.marca AS equipo_marca,
    e.modelo AS equipo_modelo,
    e.numero_serie AS equipo_numero_serie,
    t.titulo,
    t.descripcion,
    t.prioridad,
    t.estado,
    t.fecha_apertura,
    t.fecha_cierre
`

const JOIN_TICKET = `
    FROM ticket t
    INNER JOIN usuario u
        ON t.id_usuario = u.id_usuario
    INNER JOIN equipo e
        ON t.id_equipo = e.id_equipo
`

const crearTicket = async (datos) => {
    const {
        id_usuario,
        id_equipo,
        titulo,
        descripcion,
        prioridad
    } = datos;

    if (
        !id_usuario ||
        !id_equipo ||
        !titulo ||
        !descripcion ||
        !prioridad
    ) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const tituloNormalizado = titulo.trim();
    const descripcionNormalizada = descripcion.trim();
    const prioridadNormalizada = prioridad.trim();

    // Verificar que el cliente exista
    await verificarClienteExiste(id_usuario);

    // Verificar que el equipo exista y pertenezca a ese cliente
    const [equipos] = await pool.query(
        `
        SELECT id_equipo
        FROM equipo
        WHERE id_equipo = ?
        AND id_usuario = ?
        `,
        [id_equipo, id_usuario]
    );

    if (equipos.length === 0) {
        throw crearError("El equipo no existe o no pertenece a este cliente.", 404);
    }

    // Insertar ticket (fecha_apertura la asigna la base de datos)
    const [resultado] = await pool.query(
        `
        INSERT INTO ticket (
            id_usuario,
            id_equipo,
            titulo,
            descripcion,
            prioridad,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            id_usuario,
            id_equipo,
            tituloNormalizado,
            descripcionNormalizada,
            prioridadNormalizada,
            ESTADOS_TICKET.ABIERTO
        ]
    );

    // Obtener el ticket recién creado
    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [resultado.insertId]
    );

    return tickets[0];
}

// este get sirve para obtener todos los tickets registrados

const obtenerTickets = async () => {

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        ORDER BY t.id_ticket DESC
        `
    );

    return tickets;
}

// este get sirve para obtener un ticket en especifico por su id

const obtenerTicketPorId = async (id) => {

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [id]
    );

    if (tickets.length === 0) {
        throw crearError("Ticket no encontrado", 404);
    }

    return tickets[0];
}

// este get sirve para obtener todos los tickets de un usuario en especifico

const obtenerTicketsDeUsuarioPorId = async (id_usuario) => {

    await verificarUsuarioExiste(id_usuario, "El cliente no existe.");

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_usuario = ?
        ORDER BY t.id_ticket DESC
        `,
        [id_usuario]
    );

    return tickets;
}

// cierra el ticket: el sistema asigna fecha_cierre, el usuario no la maneja
const cerrarTicket = async (id) => {

    const [ticketExistente] = await pool.query(
        `
        SELECT id_ticket, estado
        FROM ticket
        WHERE id_ticket = ?
        `,
        [id]
    );

    if (ticketExistente.length === 0) {
        throw crearError("Ticket no encontrado", 404);
    }

    if (ticketExistente[0].estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket ya se encuentra cerrado.", 409);
    }

    await pool.query(
        `
        UPDATE ticket
        SET
            estado = ?,
            fecha_cierre = CURRENT_TIMESTAMP()
        WHERE id_ticket = ?
        `,
        [ESTADOS_TICKET.CERRADO, id]
    );

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [id]
    );

    return tickets[0];
}

// cambia el estado del ticket a "En proceso" o "Resuelto".
// abrir y cerrar el ticket tienen sus propios endpoints y no pasan por aquí.
const ESTADOS_PERMITIDOS = [ESTADOS_TICKET.EN_PROCESO, ESTADOS_TICKET.RESUELTO];

const cambiarEstadoTicket = async (id, estado) => {

    if (typeof estado !== "string" || !ESTADOS_PERMITIDOS.includes(estado.trim())) {
        throw crearError(
            `Estado inválido. Debe ser: ${ESTADOS_PERMITIDOS.join(" o ")}.`,
            400
        );
    }

    const estadoNormalizado = estado.trim();

    const [ticketExistente] = await pool.query(
        `
        SELECT id_ticket, estado
        FROM ticket
        WHERE id_ticket = ?
        `,
        [id]
    );

    if (ticketExistente.length === 0) {
        throw crearError("Ticket no encontrado", 404);
    }

    if (ticketExistente[0].estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket ya está cerrado y no puede cambiar de estado.", 409);
    }

    await pool.query(
        `
        UPDATE ticket
        SET estado = ?
        WHERE id_ticket = ?
        `,
        [estadoNormalizado, id]
    );

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [id]
    );

    return tickets[0];
}

module.exports = {
    crearTicket,
    obtenerTickets,
    obtenerTicketPorId,
    obtenerTicketsDeUsuarioPorId,
    cerrarTicket,
    cambiarEstadoTicket
}