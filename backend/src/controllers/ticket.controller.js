const ticketService = require("../services/ticket.service");
const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

const crearTicket = async (req, res) => {
    try {
        // quien asigna al tecnico es quien registra el ticket, sale del token
        const ticket = await ticketService.crearTicket(req.body, req.usuario.id_usuario);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "TICKET_CREADO",
            descripcion: `Registró el ticket "${ticket.titulo}" de ${ticket.cliente} y lo asignó a ${ticket.tecnico}.`,
            id_ticket: ticket.id_ticket
        });

        responder(res, 201, {
            message: "Ticket creado exitosamente",
            data: ticket
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

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
    crearTicket,
    obtenerTickets
};
