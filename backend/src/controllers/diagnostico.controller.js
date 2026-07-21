const diagnosticoService = require("../services/diagnostico.service")
const responder = require("../utils/respuesta")

const crearDiagnostico = async (req, res) => {
    try {
        const diagnostico = await diagnosticoService.crearDiagnostico(req.body);

        responder(res, 200, {
            message: "Diagnóstico creado exitosamente",
            data: diagnostico
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDiagnosticos = async (req, res) => {
    try {
        const diagnosticos = await diagnosticoService.obtenerDiagnosticos();

        responder(res, 200, {
            data: diagnosticos
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDiagnosticoPorId = async (req, res) => {
    try {
        const { id } = req.params

        const diagnostico = await diagnosticoService.obtenerDiagnosticoPorId(id);

        responder(res, 200, {
            data: diagnostico
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDiagnosticosPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params

        const diagnosticos = await diagnosticoService.obtenerDiagnosticosPorTicket(id_ticket);

        responder(res, 200, {
            data: diagnosticos
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDiagnosticosPorTecnico = async (req, res) => {
    try {
        const { id_tecnico } = req.params

        const diagnosticos = await diagnosticoService.obtenerDiagnosticosPorTecnico(id_tecnico);

        responder(res, 200, {
            data: diagnosticos
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarDiagnostico = async (req, res) => {
    try {
        const { id } = req.params

        const diagnostico = await diagnosticoService.actualizarDiagnostico(id, req.body);

        responder(res, 200, {
            data: diagnostico
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarDiagnostico = async (req, res) => {
    try {
        const { id } = req.params

        await diagnosticoService.eliminarDiagnostico(id);

        responder(res, 200, {
            message: "Diagnóstico eliminado exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearDiagnostico,
    obtenerDiagnosticos,
    obtenerDiagnosticoPorId,
    obtenerDiagnosticosPorTicket,
    obtenerDiagnosticosPorTecnico,
    actualizarDiagnostico,
    eliminarDiagnostico
}
