const facturaService = require("../services/factura.service");
const auditoriaService = require("../services/auditoria.service");
const { formatearMonto } = require("./cotizacion.controller");
const responder = require("../utils/respuesta");

const consultarFactura = async (req, res) => {
    try {
        const factura = await facturaService.consultarFactura(req.params.id, req.usuario);

        responder(res, 200, {
            data: factura
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

const generarFactura = async (req, res) => {
    try {
        const factura = await facturaService.generarFactura(req.params.id, req.usuario);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "FACTURA_EMITIDA",
            descripcion: `Emitió la factura por ${formatearMonto(factura.total)}.`,
            id_ticket: factura.id_ticket
        });

        responder(res, 201, {
            message: "Factura generada",
            data: factura
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    consultarFactura,
    generarFactura
};
