const notaPrivadaService = require("../services/notaPrivada.service")
const responder = require("../utils/respuesta")

// id_usuario sale del JWT (staff autenticado), no del body — a diferencia de
// actualizacion.controller.js, que por precedente historico confia en el
// body para ese campo.
const crearNota = async (req, res) => {
    try {
        const nota = await notaPrivadaService.crearNota({
            ...req.body,
            id_usuario: req.usuario.id_usuario
        });

        responder(res, 200, {
            message: "Nota privada registrada exitosamente",
            data: nota
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerNotasPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params

        const notas = await notaPrivadaService.obtenerNotasPorTicket(id_ticket);

        responder(res, 200, {
            data: notas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearNota,
    obtenerNotasPorTicket
}
