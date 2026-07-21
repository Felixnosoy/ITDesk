const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service")
const ESTADOS_TICKET = require("../constants/estadosTicket");
const { verificarStaffExiste } = require("../validators/usuario.validator");

const COLUMNAS_ACTUALIZACION = `
    ac.id_actualizacion,
    ac.id_ticket,
    ac.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    ac.estado,
    ac.observaciones,
    ac.fecha_actualizacion
`;

const JOIN_ACTUALIZACION = `
    FROM actualizacion ac
    INNER JOIN usuario u
        ON ac.id_usuario = u.id_usuario
`;

const ESTADOS_VALIDOS = Object.values(ESTADOS_TICKET);

const validarEstado = (estado) => {
    if (typeof estado !== "string" || !ESTADOS_VALIDOS.includes(estado.trim())) {
        throw crearError(
            `Estado inválido. Debe ser: ${ESTADOS_VALIDOS.join(", ")}.`,
            400
        );
    }
}

const crearActualizacion = async (datosActualizacion) => {
    const {
        id_ticket,
        id_usuario,
        estado,
        observaciones
    } = datosActualizacion;

    if (!id_ticket || !id_usuario || !estado) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    validarEstado(estado);

    const estadoNormalizado = estado.trim();
    const observacionesNormalizadas = observaciones?.trim() || null;

    // Verificar que el ticket exista
    await ticketService.obtenerTicketPorId(id_ticket);

    // Verificar que el usuario exista y sea staff
    await verificarStaffExiste(id_usuario);

    // Insertar actualizacion (fecha_actualizacion la asigna la base de datos)
    const [resultado] = await pool.query(
        `
        INSERT INTO actualizacion (
            id_ticket,
            id_usuario,
            estado,
            observaciones
        )
        VALUES (?, ?, ?, ?)
        `,
        [id_ticket, id_usuario, estadoNormalizado, observacionesNormalizadas]
    );

    const [actualizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ACTUALIZACION}
        ${JOIN_ACTUALIZACION}
        WHERE ac.id_actualizacion = ?
        `,
        [resultado.insertId]
    );

    return actualizaciones[0];
}

// este get sirve para obtener todas las actualizaciones registradas

const obtenerActualizaciones = async () => {

    const [actualizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ACTUALIZACION}
        ${JOIN_ACTUALIZACION}
        ORDER BY ac.id_actualizacion DESC
        `
    );

    return actualizaciones;
}

// este get sirve para obtener una actualizacion en especifico por su id

const obtenerActualizacionPorId = async (id) => {

    const [actualizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ACTUALIZACION}
        ${JOIN_ACTUALIZACION}
        WHERE ac.id_actualizacion = ?
        `,
        [id]
    );

    if (actualizaciones.length === 0) {
        throw crearError("Actualización no encontrada", 404);
    }

    return actualizaciones[0];
}

// este get sirve para obtener el historial de actualizaciones de un ticket

const obtenerActualizacionesPorTicket = async (id_ticket) => {

    await ticketService.obtenerTicketPorId(id_ticket);

    const [actualizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ACTUALIZACION}
        ${JOIN_ACTUALIZACION}
        WHERE ac.id_ticket = ?
        ORDER BY ac.id_actualizacion DESC
        `,
        [id_ticket]
    );

    return actualizaciones;
}

// este get sirve para obtener las actualizaciones hechas por un usuario del staff

const obtenerActualizacionesPorUsuario = async (id_usuario) => {

    await verificarStaffExiste(id_usuario);

    const [actualizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ACTUALIZACION}
        ${JOIN_ACTUALIZACION}
        WHERE ac.id_usuario = ?
        ORDER BY ac.id_actualizacion DESC
        `,
        [id_usuario]
    );

    return actualizaciones;
}

// este get sirve para que el cliente vea las notas de progreso publicas de su ticket
// (sin exponer que miembro del staff las escribió, y solo las que tienen observaciones)

const obtenerNotasProgresoPorTicket = async (id_ticket, id_cliente) => {

    const ticket = await ticketService.obtenerTicketPorId(id_ticket);

    if (Number(ticket.id_usuario) !== Number(id_cliente)) {
        throw crearError("No tienes permisos para ver esta información.", 403);
    }

    const [notas] = await pool.query(
        `
        SELECT
            estado,
            observaciones,
            fecha_actualizacion
        FROM actualizacion
        WHERE id_ticket = ?
        AND observaciones IS NOT NULL
        ORDER BY id_actualizacion ASC
        `,
        [id_ticket]
    );

    return notas;
}

const actualizarActualizacion = async (id, nuevosDatos) => {

    const {
        estado,
        observaciones
    } = nuevosDatos;

    if (!estado) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    validarEstado(estado);

    const estadoNormalizado = estado.trim();
    const observacionesNormalizadas = observaciones?.trim() || null;

    // Verificar que la actualizacion exista
    await obtenerActualizacionPorId(id);

    await pool.query(
        `
        UPDATE actualizacion
        SET
            estado = ?,
            observaciones = ?
        WHERE id_actualizacion = ?
        `,
        [estadoNormalizado, observacionesNormalizadas, id]
    );

    return obtenerActualizacionPorId(id);
}

const eliminarActualizacion = async (id) => {

    // Verificar que la actualizacion exista
    await obtenerActualizacionPorId(id);

    await pool.query(
        `
        DELETE FROM actualizacion
        WHERE id_actualizacion = ?
        `,
        [id]
    );
}

module.exports = {
    crearActualizacion,
    obtenerActualizaciones,
    obtenerActualizacionPorId,
    obtenerActualizacionesPorTicket,
    obtenerActualizacionesPorUsuario,
    obtenerNotasProgresoPorTicket,
    actualizarActualizacion,
    eliminarActualizacion
}
