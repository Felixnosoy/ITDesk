const equipoService = require("../services/equipo.service");
const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

const obtenerEquipos = async (req, res) => {
    try {
        const equipos = await equipoService.obtenerEquiposDeCliente(req.query.id_cliente);

        responder(res, 200, {
            data: equipos
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

const crearEquipo = async (req, res) => {
    try {
        const equipo = await equipoService.crearEquipo(req.body);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "EQUIPO_REGISTRADO",
            descripcion: `Registró el equipo ${equipo.tipo} ${equipo.marca} ${equipo.modelo} (serie ${equipo.numero_serie}).`
        });

        responder(res, 201, {
            message: "Equipo registrado exitosamente",
            data: equipo
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    obtenerEquipos,
    crearEquipo
};
