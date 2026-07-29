const facturaService = require("../services/factura.service")
const detalleFacturaService = require("../services/detalleFactura.service")
const auditoriaService = require("../services/auditoria.service")
const responder = require("../utils/respuesta")
const crearError = require("../utils/crearError")

const crearFactura = async (req, res) => {
    try {
        const factura = await facturaService.crearFactura(req.body);

        responder(res, 200, {
            message: "Factura generada exitosamente",
            data: factura
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerFacturas = async (req, res) => {
    try {
        const facturas = await facturaService.obtenerFacturas();

        responder(res, 200, {
            data: facturas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// devuelve la factura junto con sus lineas de detalle
const obtenerFacturaPorId = async (req, res) => {
    try {
        const { id } = req.params

        const factura = await facturaService.obtenerFacturaPorId(id);
        const detalle = await detalleFacturaService.obtenerDetallesPorFactura(id);

        responder(res, 200, {
            data: { ...factura, detalle }
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerFacturasPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params

        const facturas = await facturaService.obtenerFacturasPorUsuario(id_usuario);

        responder(res, 200, {
            data: facturas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// el cliente nunca envía su id_usuario: se toma del JWT ya validado
const obtenerMisFacturas = async (req, res) => {
    try {
        const { id_usuario } = req.usuario

        const facturas = await facturaService.obtenerFacturasPorUsuario(id_usuario);

        responder(res, 200, {
            data: facturas
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// detalle de una factura propia del cliente (con verificación de dueño)
const obtenerMiFacturaPorId = async (req, res) => {
    try {
        const { id } = req.params
        const { id_usuario } = req.usuario

        const factura = await facturaService.obtenerFacturaPorId(id);

        if (Number(factura.id_usuario) !== Number(id_usuario)) {
            throw crearError("No tienes permisos para ver esta información.", 403);
        }

        const detalle = await detalleFacturaService.obtenerDetallesPorFactura(id);

        responder(res, 200, {
            data: { ...factura, detalle }
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const cambiarEstadoFactura = async (req, res) => {
    try {
        const { id } = req.params
        const { estado } = req.body

        const factura = await facturaService.cambiarEstadoFactura(id, estado);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: `FACTURA_${factura.estado.toUpperCase()}`,
            descripcion: `Cambió la factura #${factura.id_factura} de ${factura.cliente} a estado "${factura.estado}".`
        });

        responder(res, 200, {
            data: factura
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarObservaciones = async (req, res) => {
    try {
        const { id } = req.params
        const { observaciones } = req.body

        const factura = await facturaService.actualizarObservaciones(id, observaciones);

        responder(res, 200, {
            data: factura
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const eliminarFactura = async (req, res) => {
    try {
        const { id } = req.params

        await facturaService.eliminarFactura(id);

        responder(res, 200, {
            message: "Factura eliminada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

module.exports = {
    crearFactura,
    obtenerFacturas,
    obtenerFacturaPorId,
    obtenerFacturasPorUsuario,
    obtenerMisFacturas,
    obtenerMiFacturaPorId,
    cambiarEstadoFactura,
    actualizarObservaciones,
    eliminarFactura
}
