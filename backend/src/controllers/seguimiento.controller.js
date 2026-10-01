const seguimientoService = require("../services/seguimiento.service");
const responder = require("../utils/respuesta");

const crearActualizacion = async (req, res) => {
    try {
        const actualizacion = await seguimientoService.crearActualizacion(
            req.params.id,
            req.body ?? {},
            req.usuario,
            req.files
        );

        responder(res, 201, {
            message: "Avance registrado",
            data: actualizacion
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

const crearNota = async (req, res) => {
    try {
        const nota = await seguimientoService.crearNota(
            req.params.id,
            req.body ?? {},
            req.usuario,
            req.files
        );

        responder(res, 201, {
            message: "Nota privada registrada",
            data: nota
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    crearActualizacion,
    crearNota
};
