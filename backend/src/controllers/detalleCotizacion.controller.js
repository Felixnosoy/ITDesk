const detalleCotizacionService = require("../services/detalleCotizacion.service")
const responder = require("../utils/respuesta")

const crearDetalleCotizacion = async (req, res) => {
    try {
        const detalle = await detalleCotizacionService.crearDetalleCotizacion(req.body);

        responder(res, 200, {
            message: "Línea de cotización agregada exitosamente",
            data: detalle
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDetallesCotizacion = async (req, res) => {
    try {
        const detalles = await detalleCotizacionService.obtenerDetallesCotizacion();

        responder(res, 200, {
            data: detalles
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDetalleCotizacionPorId = async (req, res) => {
    try {
        const { id } = req.params

        const detalle = await detalleCotizacionService.obtenerDetalleCotizacionPorId(id);

        responder(res, 200, {
            data: detalle
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerDetallesPorCotizacion = async (req, res) => {
    try {
        const { id_cotizacion } = req.params

        const detalles = await detalleCotizacionService.obtenerDetallesPorCotizacion(id_cotizacion);

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

        const detalles = await detalleCotizacionService.obtenerDetallesPorTicket(id_ticket);

        responder(res, 200, {
            data: detalles
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerMisDetallesPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params
        const { id_usuario } = req.usuario

        const detalles = await detalleCotizacionService.obtenerMisDetallesPorTicket(id_ticket, id_usuario);

        responder(res, 200, {
            data: detalles
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarDetalleCotizacion = async (req, res) => {
    try {
        const { id } = req.params

        const detalle = await detalleCotizacionService.actualizarDetalleCotizacion(id, req.body);

        responder(res, 200, {
            data: detalle
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarDetalleCotizacion = async (req, res) => {
    try {
        const { id } = req.params

        await detalleCotizacionService.eliminarDetalleCotizacion(id);

        responder(res, 200, {
            message: "Línea de cotización eliminada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearDetalleCotizacion,
    obtenerDetallesCotizacion,
    obtenerDetalleCotizacionPorId,
    obtenerDetallesPorCotizacion,
    obtenerDetallesPorTicket,
    obtenerMisDetallesPorTicket,
    actualizarDetalleCotizacion,
    eliminarDetalleCotizacion
}
