// Helper de respuestas HTTP: centraliza el envoltorio { success, message, data }
// que antes se repetía manualmente en cada controller.
const responder = (res, status, payload = {}) => {
    const { message, data, ...resto } = payload;

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
