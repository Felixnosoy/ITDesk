const equipoController = require("../services/equipo.service")
const responder = require("../utils/respuesta")

const crearEquipo = async (req, res) => {
    try {
        const equipo = await equipoController.crearEquipo(req.body);

        responder(res, 200, {
            message: "Equipo creado exitosamente",
            data: equipo
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })

    }
}

const obtenerEquipos = async (req, res) => {
    try {
        const equipos = await equipoController.obtenerEquipos();

        responder(res, 200, {
            data: equipos
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerEquipoPorId = async (req, res) => {
    try {
        const { id } = req.params

        const equipo = await equipoController.obtenerEquipoPorId(id);

        responder(res, 200, {
            data: equipo
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerEquiposDeUsuarioPorId = async (req, res) => {
    try {
        const { id_usuario } = req.params

        const equipos = await equipoController.obtenerEquiposDeUsuarioPorId(id_usuario);

        responder(res, 200, {
            data: equipos
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarEquipo = async (req, res) => {
    try {
        const { id } = req.params

        const equipo = await equipoController.actualizarEquipo(id, req.body);

        responder(res, 200, {
            data: equipo
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarEquipo = async (req, res) => {
    try {
        const { id } = req.params

        await equipoController.eliminarEquipo(id);

        responder(res, 200, {
            message: "Equipo eliminado exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearEquipo,
    obtenerEquipos,
    obtenerEquipoPorId,
    obtenerEquiposDeUsuarioPorId,
    actualizarEquipo,
    eliminarEquipo
}
