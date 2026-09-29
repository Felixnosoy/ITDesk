const ticketService = require("../services/ticket.service");
const responder = require("../utils/respuesta");

const obtenerTickets = async (req, res) => {
    try {
        const tickets = await ticketService.obtenerTickets(req.usuario);

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
