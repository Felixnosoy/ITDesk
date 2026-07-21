const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service")
const { verificarTecnicoExiste } = require("../validators/usuario.validator");

const COLUMNAS_ASIGNACION = `
    a.id_asignacion,
    a.id_ticket,
    a.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS tecnico,
    a.fecha_asignacion,
    a.activa
`;

const JOIN_ASIGNACION = `
    FROM asignacion a
    INNER JOIN usuario u
        ON a.id_usuario = u.id_usuario
`;

const crearAsignacion = async (datosAsignacion) => {
    const {
        id_ticket,
        id_usuario: id_tecnico
    } = datosAsignacion;

    if (!id_ticket || !id_tecnico) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    // Verificar que el ticket exista
    await ticketService.obtenerTicketPorId(id_ticket);

    // Verificar que el usuario exista y tenga rol de Tecnico
    await verificarTecnicoExiste(id_tecnico);

    // Verificar que el ticket no tenga ya una asignación activa
    const [asignacionActiva] = await pool.query(
        `
        SELECT id_asignacion
        FROM asignacion
        WHERE id_ticket = ?
        AND activa = TRUE
        `,
        [id_ticket]
    );

    if (asignacionActiva.length > 0) {
        throw crearError("Este ticket ya tiene un técnico asignado.", 409);
    }

    // Insertar asignación (fecha_asignacion la asigna la base de datos)
    const [resultado] = await pool.query(
        `
        INSERT INTO asignacion (
            id_ticket,
            id_usuario,
            activa
        )
        VALUES (?, ?, TRUE)
        `,
        [id_ticket, id_tecnico]
    );

    const [asignaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ASIGNACION}
        ${JOIN_ASIGNACION}
        WHERE a.id_asignacion = ?
        `,
        [resultado.insertId]
    );

    return asignaciones[0];
}

// este get sirve para obtener todas las asignaciones registradas

const obtenerAsignaciones = async () => {

    const [asignaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ASIGNACION}
        ${JOIN_ASIGNACION}
        ORDER BY a.id_asignacion DESC
        `
    );

    return asignaciones;
}

// este get sirve para obtener una asignacion en especifico por su id

const obtenerAsignacionPorId = async (id) => {

    const [asignaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ASIGNACION}
        ${JOIN_ASIGNACION}
        WHERE a.id_asignacion = ?
        `,
        [id]
    );

    if (asignaciones.length === 0) {
        throw crearError("Asignación no encontrada", 404);
    }

    return asignaciones[0];
}

// este get sirve para obtener el historial de asignaciones de un ticket

const obtenerAsignacionesPorTicket = async (id_ticket) => {

    await ticketService.obtenerTicketPorId(id_ticket);

    const [asignaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ASIGNACION}
        ${JOIN_ASIGNACION}
        WHERE a.id_ticket = ?
        ORDER BY a.id_asignacion DESC
        `,
        [id_ticket]
    );

    return asignaciones;
}

// este get sirve para obtener las asignaciones de un tecnico en especifico

const obtenerAsignacionesPorTecnico = async (id_tecnico) => {

    await verificarTecnicoExiste(id_tecnico);

    const [asignaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ASIGNACION}
        ${JOIN_ASIGNACION}
        WHERE a.id_usuario = ?
        ORDER BY a.id_asignacion DESC
        `,
        [id_tecnico]
    );

    return asignaciones;
}

const actualizarAsignacion = async (id, nuevosDatos) => {

    const {
        id_usuario: id_tecnico,
        activa
    } = nuevosDatos;

    if (!id_tecnico || typeof activa !== "boolean") {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    // Verificar que la asignación exista
    await obtenerAsignacionPorId(id);

    // Verificar que el nuevo técnico exista y tenga rol de Tecnico
    await verificarTecnicoExiste(id_tecnico);

    await pool.query(
        `
        UPDATE asignacion
        SET
            id_usuario = ?,
            activa = ?
        WHERE id_asignacion = ?
        `,
        [id_tecnico, activa, id]
    );

    return obtenerAsignacionPorId(id);
}

const eliminarAsignacion = async (id) => {

    // Verificar que la asignación exista
    await obtenerAsignacionPorId(id);

    await pool.query(
        `
        DELETE FROM asignacion
        WHERE id_asignacion = ?
        `,
        [id]
    );
}

module.exports = {
    crearAsignacion,
    obtenerAsignaciones,
    obtenerAsignacionPorId,
    obtenerAsignacionesPorTicket,
    obtenerAsignacionesPorTecnico,
    actualizarAsignacion,
    eliminarAsignacion
}
