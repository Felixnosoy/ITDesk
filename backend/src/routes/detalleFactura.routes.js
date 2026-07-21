const express = require('express');

const router = express.Router();

const detalleFacturaController = require("../controllers/detalleFactura.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// solo lectura: las lineas se generan automáticamente al crear la factura

// obtener todas las lineas de detalle de factura
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleFacturaController.obtenerDetallesFactura
)

// obtener las lineas de una factura en especifico
router.get(
    "/factura/:id_factura",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleFacturaController.obtenerDetallesPorFactura
)

// obtener las lineas de factura relacionadas a un ticket
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleFacturaController.obtenerDetallesPorTicket
)

// obtener una linea por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleFacturaController.obtenerDetalleFacturaPorId
)

module.exports = router
