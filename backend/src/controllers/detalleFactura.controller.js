const detalleFacturaService = require("../services/detalleFactura.service")
const responder = require("../utils/respuesta")

const obtenerDetallesFactura = async (req, res) => {
    try {
        const detalles = await detalleFacturaService.obtenerDetallesFactura();

        responder(res, 200, {
            data: detalles
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDetalleFacturaPorId = async (req, res) => {
    try {
        const { id } = req.params

        const detalle = await detalleFacturaService.obtenerDetalleFacturaPorId(id);

        responder(res, 200, {
            data: detalle
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDetallesPorFactura = async (req, res) => {
    try {
        const { id_factura } = req.params

        const detalles = await detalleFacturaService.obtenerDetallesPorFactura(id_factura);

        responder(res, 200, {
            data: detalles
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDetallesPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params

        const detalles = await detalleFacturaService.obtenerDetallesPorTicket(id_ticket);

        responder(res, 200, {
            data: detalles
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    obtenerDetallesFactura,
    obtenerDetalleFacturaPorId,
    obtenerDetallesPorFactura,
    obtenerDetallesPorTicket
}
