const encuestaService = require("../services/encuesta.service");
const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

// el cliente nunca envía su id_usuario: se toma del JWT ya validado
const crearEncuesta = async (req, res) => {
    try {
        const { id_usuario } = req.usuario;
        const { id_ticket, calificacion, comentario } = req.body;

        const encuesta = await encuestaService.crearEncuesta({
            id_ticket,
            id_usuario,
            calificacion,
            comentario
        });

        auditoriaService.registrarEvento({
            id_usuario,
            accion: "TICKET_CALIFICADO",
            descripcion: `Calificó el ticket #${id_ticket} con ${encuesta.calificacion}/5.`,
            id_ticket
        });

        responder(res, 200, {
            message: "¡Gracias por tu calificación!",
            data: encuesta
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerEncuestaPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params

        const encuesta = await encuestaService.obtenerEncuestaPorTicket(id_ticket);

        responder(res, 200, {
            data: encuesta
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerMiEncuestaPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params
        const { id_usuario } = req.usuario

        const encuesta = await encuestaService.obtenerMiEncuestaPorTicket(id_ticket, id_usuario);

        responder(res, 200, {
            data: encuesta
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerEncuestas = async (req, res) => {
    try {
        const encuestas = await encuestaService.obtenerEncuestas();

        responder(res, 200, {
            data: encuestas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearEncuesta,
    obtenerEncuestaPorTicket,
    obtenerMiEncuestaPorTicket,
    obtenerEncuestas
}
