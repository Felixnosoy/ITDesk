const notificacionService = require("../services/notificacion.service")
const responder = require("../utils/respuesta")

const crearNotificacion = async (req, res) => {
    try {
        const notificacion = await notificacionService.crearNotificacion(req.body);

        responder(res, 200, {
            message: "Notificación creada exitosamente",
            data: notificacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerNotificaciones = async (req, res) => {
    try {
        const notificaciones = await notificacionService.obtenerNotificaciones();

        responder(res, 200, {
            data: notificaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerNotificacionPorId = async (req, res) => {
    try {
        const { id } = req.params

        const notificacion = await notificacionService.obtenerNotificacionPorId(id);

        responder(res, 200, {
            data: notificacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerNotificacionesPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params

        const notificaciones = await notificacionService.obtenerNotificacionesPorTicket(id_ticket);

        responder(res, 200, {
            data: notificaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerNotificacionesPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params

        const notificaciones = await notificacionService.obtenerNotificacionesPorUsuario(id_usuario);

        responder(res, 200, {
            data: notificaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// el usuario nunca envía su id_usuario: se toma del JWT ya validado
const obtenerMisNotificaciones = async (req, res) => {
    try {
        const { id_usuario } = req.usuario

        const notificaciones = await notificacionService.obtenerNotificacionesPorUsuario(id_usuario);

        responder(res, 200, {
            data: notificaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const marcarMiNotificacionComoLeida = async (req, res) => {
    try {
        const { id } = req.params
        const { id_usuario } = req.usuario

        const notificacion = await notificacionService.marcarComoLeida(id, id_usuario);

        responder(res, 200, {
            data: notificacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarNotificacion = async (req, res) => {
    try {
        const { id } = req.params

        await notificacionService.eliminarNotificacion(id);

        responder(res, 200, {
            message: "Notificación eliminada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearNotificacion,
    obtenerNotificaciones,
    obtenerNotificacionPorId,
    obtenerNotificacionesPorTicket,
    obtenerNotificacionesPorUsuario,
    obtenerMisNotificaciones,
    marcarMiNotificacionComoLeida,
    eliminarNotificacion
}
