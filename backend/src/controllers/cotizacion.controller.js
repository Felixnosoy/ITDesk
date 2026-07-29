const cotizacionService = require("../services/cotizacion.service")
const detalleCotizacionService = require("../services/detalleCotizacion.service")
const auditoriaService = require("../services/auditoria.service")
const responder = require("../utils/respuesta")
const crearError = require("../utils/crearError")

const crearCotizacion = async (req, res) => {
    try {
        const cotizacion = await cotizacionService.crearCotizacion(req.body);

        responder(res, 200, {
            message: "Cotización creada exitosamente",
            data: cotizacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerCotizaciones = async (req, res) => {
    try {
        const cotizaciones = await cotizacionService.obtenerCotizaciones();

        responder(res, 200, {
            data: cotizaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// devuelve la cotizacion junto con sus lineas de detalle
const obtenerCotizacionPorId = async (req, res) => {
    try {
        const { id } = req.params

        const cotizacion = await cotizacionService.obtenerCotizacionPorId(id);
        const detalle = await detalleCotizacionService.obtenerDetallesPorCotizacion(id);

        responder(res, 200, {
            data: { ...cotizacion, detalle }
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerCotizacionesPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params

        const cotizaciones = await cotizacionService.obtenerCotizacionesPorUsuario(id_usuario);

        responder(res, 200, {
            data: cotizaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// el cliente nunca envía su id_usuario: se toma del JWT ya validado
const obtenerMisCotizaciones = async (req, res) => {
    try {
        const { id_usuario } = req.usuario

        const cotizaciones = await cotizacionService.obtenerCotizacionesPorUsuario(id_usuario);

        responder(res, 200, {
            data: cotizaciones
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// detalle de una cotizacion propia del cliente (con verificación de dueño)
const obtenerMiCotizacionPorId = async (req, res) => {
    try {
        const { id } = req.params
        const { id_usuario } = req.usuario

        const cotizacion = await cotizacionService.obtenerCotizacionPorId(id);

        if (Number(cotizacion.id_usuario) !== Number(id_usuario)) {
            throw crearError("No tienes permisos para ver esta información.", 403);
        }

        const detalle = await detalleCotizacionService.obtenerDetallesPorCotizacion(id);

        responder(res, 200, {
            data: { ...cotizacion, detalle }
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarDescuentoTotal = async (req, res) => {
    try {
        const { id } = req.params
        const { descuento_total } = req.body

        const cotizacion = await cotizacionService.actualizarDescuentoTotal(id, descuento_total);

        responder(res, 200, {
            data: cotizacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const CAMBIO_A_ACCION = { Aprobada: "Aprobó", Rechazada: "Rechazó" };

const cambiarEstadoCotizacion = async (req, res) => {
    try {
        const { id } = req.params
        const { estado } = req.body

        const cotizacion = await cotizacionService.cambiarEstadoCotizacion(id, estado);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: `COTIZACION_${cotizacion.estado.toUpperCase()}`,
            descripcion: `${CAMBIO_A_ACCION[cotizacion.estado] || "Actualizó"} la cotización #${cotizacion.id_cotizacion} de ${cotizacion.cliente}.`
        });

        responder(res, 200, {
            data: cotizacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// el cliente aprueba/rechaza su propia cotizacion (nunca la del tecnico)
const cambiarEstadoCotizacionCliente = async (req, res) => {
    try {
        const { id } = req.params
        const { estado } = req.body
        const { id_usuario } = req.usuario

        const cotizacion = await cotizacionService.cambiarEstadoCotizacionCliente(id, estado, id_usuario);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: `COTIZACION_${cotizacion.estado.toUpperCase()}`,
            descripcion: `${CAMBIO_A_ACCION[cotizacion.estado] || "Actualizó"} la cotización #${cotizacion.id_cotizacion} de ${cotizacion.cliente}.`
        });

        responder(res, 200, {
            data: cotizacion
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarCotizacion = async (req, res) => {
    try {
        const { id } = req.params

        await cotizacionService.eliminarCotizacion(id);

        responder(res, 200, {
            message: "Cotización eliminada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearCotizacion,
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    obtenerCotizacionesPorUsuario,
    obtenerMisCotizaciones,
    obtenerMiCotizacionPorId,
    actualizarDescuentoTotal,
    cambiarEstadoCotizacion,
    cambiarEstadoCotizacionCliente,
    eliminarCotizacion
}
