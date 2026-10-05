const cotizacionService = require("../services/cotizacion.service");
const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

const formatearMonto = (monto) => `RD$${monto.toFixed(2)}`;

const listarCotizaciones = async (req, res) => {
    try {
        const cotizaciones = await cotizacionService.listarCotizaciones(req.params.id, req.usuario);

        responder(res, 200, {
            data: cotizaciones
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

const crearCotizacion = async (req, res) => {
    try {
        const cotizacion = await cotizacionService.crearCotizacion(
            req.params.id,
            req.body,
            req.usuario
        );

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "COTIZACION_CREADA",
            descripcion: `Creó una cotización por ${formatearMonto(cotizacion.total)} y la envió al cliente.`,
            id_ticket: cotizacion.id_ticket
        });

        responder(res, 201, {
            message: "Cotización creada y enviada al cliente",
            data: cotizacion
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

const decidirCotizacion = async (req, res) => {
    try {
        const { cotizacion } = await cotizacionService.decidirCotizacion(
            req.params.id,
            req.params.idCotizacion,
            req.body,
            req.usuario
        );
        const aprobada = cotizacion.estado === "Aprobada";

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: aprobada ? "COTIZACION_APROBADA" : "COTIZACION_RECHAZADA",
            descripcion: `${aprobada ? "Aprobó" : "Rechazó"} la cotización por ${formatearMonto(cotizacion.total)}.`,
            id_ticket: cotizacion.id_ticket
        });

        responder(res, 200, {
            message: aprobada ? "Cotización aprobada" : "Cotización rechazada",
            data: cotizacion
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    formatearMonto,
    decidirCotizacion,
    listarCotizaciones,
    crearCotizacion
};
