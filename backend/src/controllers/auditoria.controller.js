const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

const obtenerEventos = async (req, res) => {
    try {
        const eventos = await auditoriaService.obtenerEventos();

        responder(res, 200, {
            data: eventos
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    obtenerEventos
}
