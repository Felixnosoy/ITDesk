const ticketService = require("../services/ticket.service")
const auditoriaService = require("../services/auditoria.service")
const responder = require("../utils/respuesta")

const crearTicket = async (req, res) => {
    try {
        const ticket = await ticketService.crearTicket(req.body);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "TICKET_CREADO",
            descripcion: `Creó el ticket #${ticket.id_ticket} ("${ticket.titulo}") para ${ticket.cliente}.`,
            id_ticket: ticket.id_ticket
        });

        responder(res, 200, {
            message: "Ticket creado exitosamente",
            data: ticket
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerTickets = async (req, res) => {
    try {
        const tickets = await ticketService.obtenerTickets();

        responder(res, 200, {
            data: tickets
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerTicketPorId = async (req, res) => {
    try {
        const { id } = req.params

        const ticket = await ticketService.obtenerTicketPorId(id);

        responder(res, 200, {
            data: ticket
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerTicketsDeUsuarioPorId = async (req, res) => {
    try {
        const { id_usuario } = req.params

        const tickets = await ticketService.obtenerTicketsDeUsuarioPorId(id_usuario);

        responder(res, 200, {
            data: tickets
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// el cliente nunca envía un id_usuario: se toma del JWT ya validado
const obtenerMisTickets = async (req, res) => {
    try {
        const { id_usuario } = req.usuario

        const tickets = await ticketService.obtenerTicketsDeUsuarioPorId(id_usuario);

        responder(res, 200, {
            data: tickets
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const cerrarTicket = async (req, res) => {
    try {
        const { id } = req.params

        const ticket = await ticketService.cerrarTicket(id);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "TICKET_CERRADO",
            descripcion: `Cerró el ticket #${ticket.id_ticket} ("${ticket.titulo}").`,
            id_ticket: ticket.id_ticket
        });

        responder(res, 200, {
            message: "Ticket cerrado exitosamente",
            data: ticket
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const cambiarEstadoTicket = async (req, res) => {
    try {
        const { id } = req.params
        const { estado, sin_costo, motivo_sin_costo } = req.body

        const ticket = await ticketService.cambiarEstadoTicket(id, estado, {
            sinCosto: sin_costo,
            motivoSinCosto: motivo_sin_costo
        });

        if (estado === "Resuelto" && sin_costo) {
            auditoriaService.registrarEvento({
                id_usuario: req.usuario.id_usuario,
                accion: "TICKET_RESUELTO_SIN_COSTO",
                descripcion: `Marcó el ticket #${ticket.id_ticket} ("${ticket.titulo}") como resuelto sin costo. Motivo: ${motivo_sin_costo.trim()}.`,
                id_ticket: ticket.id_ticket
            });
        }

        responder(res, 200, {
            data: ticket
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearTicket,
    obtenerTickets,
    obtenerTicketPorId,
    obtenerTicketsDeUsuarioPorId,
    obtenerMisTickets,
    cerrarTicket,
    cambiarEstadoTicket
}
