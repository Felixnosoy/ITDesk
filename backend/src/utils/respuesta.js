// Helper de respuestas HTTP: centraliza el envoltorio { success, message, data }
// que antes se repetía manualmente en cada controller.
const { esProduccion } = require("../config/entorno");

const MENSAJE_ERROR_INTERNO = "Ocurrió un error interno. Intenta de nuevo más tarde.";

// En produccion un 500 (error no previsto) nunca devuelve el mensaje original: puede traer
// detalles de la base (nombres de tablas, el usuario de MySQL) que no le
// sirven al usuario y si a un atacante. Queda en el log del servidor.
const ocultarSiEsInterno = (status, message) => {
    if (status !== 500 || !esProduccion()) return message;

    console.error(`[${status}] ${message}`);
    return MENSAJE_ERROR_INTERNO;
};

const responder = (res, status, payload = {}) => {
    const { data, ...resto } = payload;
    const message = ocultarSiEsInterno(status, payload.message);
    delete resto.message;

    const cuerpo = {
        success: status < 400
    };

    if (message !== undefined) {
        cuerpo.message = message;
    }

    if (data !== undefined) {
        cuerpo.data = data;
    }

    Object.assign(cuerpo, resto);

    return res.status(status).json(cuerpo);
};

module.exports = responder;
