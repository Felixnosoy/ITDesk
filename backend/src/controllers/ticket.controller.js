const ticketService = require("../services/ticket.service");
const responder = require("../utils/respuesta");

const obtenerTickets = async (req, res) => {
    try {
        const { estado, prioridad, categoria } = req.query;

        const tickets = await ticketService.obtenerTickets(req.usuario, {
            estado,
            prioridad,
            categoria
        });

        responder(res, 200, {
            data: tickets
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    obtenerTickets
};
