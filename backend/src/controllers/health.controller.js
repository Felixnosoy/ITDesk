const healthService = require("../services/health.service");
const responder = require("../utils/respuesta");

// 200 si todo responde, 503 si la base no esta disponible: asi un monitor
// (por ejemplo el health check de Render) detecta la caida solo con el
// codigo, sin leer el cuerpo. Nunca se devuelve el detalle del error.
const health = async (req, res) => {
    const estado = await healthService.obtenerEstado();
    const disponible = estado.estado === "ok";

    responder(res, disponible ? 200 : 503, {
        message: disponible
            ? "API y base de datos funcionando"
            : "La API responde pero la base de datos no está disponible",
        data: estado
    });
};

module.exports = { health };
