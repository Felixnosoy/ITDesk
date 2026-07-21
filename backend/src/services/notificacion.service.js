const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service")
const { verificarUsuarioExiste } = require("../validators/usuario.validator");

const COLUMNAS_NOTIFICACION = `
    n.id_notificacion,
    n.id_ticket,
    t.titulo AS ticket_titulo,
    n.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    n.tipo,
    n.mensaje,
    n.leida,
    n.fecha_envio
`;

const JOIN_NOTIFICACION = `
    FROM notificacion n
    INNER JOIN usuario u
        ON n.id_usuario = u.id_usuario
    INNER JOIN ticket t
        ON n.id_ticket = t.id_ticket
`;

const crearNotificacion = async (datos) => {
    const {
        id_ticket,
        id_usuario,
        tipo,
        mensaje
    } = datos;

    if (!id_ticket || !id_usuario || !tipo || !mensaje) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const tipoNormalizado = tipo.trim();
    const mensajeNormalizado = mensaje.trim();

    if (tipoNormalizado.length > 50) {
        throw crearError("El campo tipo no puede superar los 50 caracteres.", 400);
    }

    // Verificar que el ticket exista
    await ticketService.obtenerTicketPorId(id_ticket);

    // Verificar que el usuario destinatario exista
    await verificarUsuarioExiste(id_usuario, "El usuario no existe.");

    // Insertar notificacion (fecha_envio y leida los asigna la base de datos)
    const [resultado] = await pool.query(
        `
        INSERT INTO notificacion (
            id_ticket,
            id_usuario,
            tipo,
            mensaje
        )
        VALUES (?, ?, ?, ?)
        `,
        [id_ticket, id_usuario, tipoNormalizado, mensajeNormalizado]
    );

    const [notificaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTIFICACION}
        ${JOIN_NOTIFICACION}
        WHERE n.id_notificacion = ?
        `,
        [resultado.insertId]
    );

    return notificaciones[0];
}

// este get sirve para obtener todas las notificaciones registradas

const obtenerNotificaciones = async () => {

    const [notificaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTIFICACION}
        ${JOIN_NOTIFICACION}
        ORDER BY n.id_notificacion DESC
        `
    );

    return notificaciones;
}

// este get sirve para obtener una notificacion en especifico por su id

const obtenerNotificacionPorId = async (id) => {

    const [notificaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTIFICACION}
        ${JOIN_NOTIFICACION}
        WHERE n.id_notificacion = ?
        `,
        [id]
    );

    if (notificaciones.length === 0) {
        throw crearError("Notificación no encontrada", 404);
    }

    return notificaciones[0];
}

// este get sirve para obtener las notificaciones de un ticket en especifico

const obtenerNotificacionesPorTicket = async (id_ticket) => {

    await ticketService.obtenerTicketPorId(id_ticket);

    const [notificaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTIFICACION}
        ${JOIN_NOTIFICACION}
        WHERE n.id_ticket = ?
        ORDER BY n.id_notificacion DESC
        `,
        [id_ticket]
    );

    return notificaciones;
}

// este get sirve para obtener las notificaciones de un usuario en especifico

const obtenerNotificacionesPorUsuario = async (id_usuario) => {

    await verificarUsuarioExiste(id_usuario, "El usuario no existe.");

    const [notificaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTIFICACION}
        ${JOIN_NOTIFICACION}
        WHERE n.id_usuario = ?
        ORDER BY n.id_notificacion DESC
        `,
        [id_usuario]
    );

    return notificaciones;
}

// marca una notificacion como leida. id_usuario_solicitante es quien hace la
// peticion (sale del JWT): solo el dueño de la notificacion puede marcarla.
const marcarComoLeida = async (id, id_usuario_solicitante) => {

    const notificacion = await obtenerNotificacionPorId(id);

    if (Number(notificacion.id_usuario) !== Number(id_usuario_solicitante)) {
        throw crearError("No tienes permisos para modificar esta notificación.", 403);
    }

    await pool.query(
        `
        UPDATE notificacion
        SET leida = TRUE
        WHERE id_notificacion = ?
        `,
        [id]
    );

    return obtenerNotificacionPorId(id);
}

const eliminarNotificacion = async (id) => {

    // Verificar que la notificacion exista
    await obtenerNotificacionPorId(id);

    await pool.query(
        `
        DELETE FROM notificacion
        WHERE id_notificacion = ?
        `,
        [id]
    );
}

module.exports = {
    crearNotificacion,
    obtenerNotificaciones,
    obtenerNotificacionPorId,
    obtenerNotificacionesPorTicket,
    obtenerNotificacionesPorUsuario,
    marcarComoLeida,
    eliminarNotificacion
}
