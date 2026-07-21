const actualizacionService = require("../services/actualizacion.service")
const responder = require("../utils/respuesta")

const crearActualizacion = async (req, res) => {
    try {
        const actualizacion = await actualizacionService.crearActualizacion(req.body);

        responder(res, 200, {
            message: "Actualización registrada exitosamente",
            data: actualizacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerActualizaciones = async (req, res) => {
    try {
        const actualizaciones = await actualizacionService.obtenerActualizaciones();

        responder(res, 200, {
            data: actualizaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerActualizacionPorId = async (req, res) => {
    try {
        const { id } = req.params

        const actualizacion = await actualizacionService.obtenerActualizacionPorId(id);

        responder(res, 200, {
            data: actualizacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerActualizacionesPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params

        const actualizaciones = await actualizacionService.obtenerActualizacionesPorTicket(id_ticket);

        responder(res, 200, {
            data: actualizaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerActualizacionesPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params

        const actualizaciones = await actualizacionService.obtenerActualizacionesPorUsuario(id_usuario);

        responder(res, 200, {
            data: actualizaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// el cliente nunca envía su id_usuario: se toma del JWT ya validado
const obtenerMisNotasProgreso = async (req, res) => {
    try {
        const { id_ticket } = req.params
        const { id_usuario } = req.usuario

        const notas = await actualizacionService.obtenerNotasProgresoPorTicket(id_ticket, id_usuario);

        responder(res, 200, {
            data: notas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarActualizacion = async (req, res) => {
    try {
        const { id } = req.params

        const actualizacion = await actualizacionService.actualizarActualizacion(id, req.body);

        responder(res, 200, {
            data: actualizacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarActualizacion = async (req, res) => {
    try {
        const { id } = req.params

        await actualizacionService.eliminarActualizacion(id);

        responder(res, 200, {
            message: "Actualización eliminada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearActualizacion,
    obtenerActualizaciones,
    obtenerActualizacionPorId,
    obtenerActualizacionesPorTicket,
    obtenerActualizacionesPorUsuario,
    obtenerMisNotasProgreso,
    actualizarActualizacion,
    eliminarActualizacion
}
