const especialidadService = require("../services/especialidad.service")
const responder = require("../utils/respuesta")

const crearEspecialidad = async (req, res) => {
    try {
        const especialidad = await especialidadService.crearEspecialidad(req.body);

        responder(res, 200, {
            message: "Especialidad creada exitosamente",
            data: especialidad
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerEspecialidades = async (req, res) => {
    try {
        const especialidades = await especialidadService.obtenerEspecialidades();

        responder(res, 200, {
            data: especialidades
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarEspecialidad = async (req, res) => {
    try {
        const { id } = req.params

        const especialidad = await especialidadService.actualizarEspecialidad(id, req.body);

        responder(res, 200, {
            data: especialidad
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarEspecialidad = async (req, res) => {
    try {
        const { id } = req.params

        await especialidadService.eliminarEspecialidad(id);

        responder(res, 200, {
            message: "Especialidad eliminada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearEspecialidad,
    obtenerEspecialidades,
    actualizarEspecialidad,
    eliminarEspecialidad
}
