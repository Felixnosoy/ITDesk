const ticketService = require("../services/ticket.service")
const responder = require("../utils/respuesta")

const crearTicket = async (req, res) => {
    try {
        const ticket = await ticketService.crearTicket(req.body);

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
        const { estado } = req.body

        const ticket = await ticketService.cambiarEstadoTicket(id, estado);

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
