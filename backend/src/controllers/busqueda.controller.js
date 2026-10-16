const busquedaService = require("../services/busqueda.service");
const responder = require("../utils/respuesta");

const buscar = async (req, res) => {
    try {
        const resultados = await busquedaService.buscar(req.query.q, req.usuario);

        responder(res, 200, {
            data: resultados
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    buscar
};
