const estadoService = require("../services/estado.service");
const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

const cambiarEstado = async (req, res) => {
    try {
        const { anterior, ticket } = await estadoService.cambiarEstado(
            req.params.id,
            req.body,
            req.usuario
        );

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "TICKET_ESTADO_CAMBIADO",
            descripcion: `Cambió el estado del ticket de ${anterior} a ${ticket.estado}.`,
            id_ticket: ticket.id_ticket
        });

        responder(res, 200, {
            message: "Estado actualizado",
            data: ticket
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    cambiarEstado
};
