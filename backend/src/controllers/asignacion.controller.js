const asignacionService = require("../services/asignacion.service")
const responder = require("../utils/respuesta")

const crearAsignacion = async (req, res) => {
    try {
        const asignacion = await asignacionService.crearAsignacion(req.body);

        responder(res, 200, {
            message: "Técnico asignado exitosamente",
            data: asignacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerAsignaciones = async (req, res) => {
    try {
        const asignaciones = await asignacionService.obtenerAsignaciones();

        responder(res, 200, {
            data: asignaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerAsignacionPorId = async (req, res) => {
    try {
        const { id } = req.params

        const asignacion = await asignacionService.obtenerAsignacionPorId(id);

        responder(res, 200, {
            data: asignacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerAsignacionesPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params

        const asignaciones = await asignacionService.obtenerAsignacionesPorTicket(id_ticket);

        responder(res, 200, {
            data: asignaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerAsignacionesPorTecnico = async (req, res) => {
    try {
        const { id_tecnico } = req.params

        const asignaciones = await asignacionService.obtenerAsignacionesPorTecnico(id_tecnico);

        responder(res, 200, {
            data: asignaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarAsignacion = async (req, res) => {
    try {
        const { id } = req.params

        const asignacion = await asignacionService.actualizarAsignacion(id, req.body);

        responder(res, 200, {
            data: asignacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarAsignacion = async (req, res) => {
    try {
        const { id } = req.params

        await asignacionService.eliminarAsignacion(id);

        responder(res, 200, {
            message: "Asignación eliminada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
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
