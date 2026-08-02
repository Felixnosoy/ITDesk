const estadisticasService = require("../services/estadisticas.service");
const responder = require("../utils/respuesta");

const obtenerEstadisticasPublicas = async (req, res) => {
    try {
        const data = await estadisticasService.obtenerEstadisticasPublicas();

        responder(res, 200, { data });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = { obtenerEstadisticasPublicas };
