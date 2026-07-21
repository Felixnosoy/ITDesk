const express = require('express');

const router = express.Router();

const facturaController = require("../controllers/factura.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// generar una factura a partir de una cotizacion aprobada
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    facturaController.crearFactura
)

// obtener todas las facturas
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    facturaController.obtenerFacturas
)

// obtener las facturas del cliente autenticado
router.get(
    "/mis",
    verificarRol(ROLES.CLIENTE),
    facturaController.obtenerMisFacturas
)

// obtener el detalle de una factura propia del cliente autenticado
router.get(
    "/mis/:id",
    verificarRol(ROLES.CLIENTE),
    facturaController.obtenerMiFacturaPorId
)

// obtener las facturas de un cliente en especifico
router.get(
    "/usuario/:id_usuario",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    facturaController.obtenerFacturasPorUsuario
)

// obtener una factura (con su detalle) por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    facturaController.obtenerFacturaPorId
)

// marcar la factura como Pagada, Anulada o Vencida
router.patch(
    "/:id/estado",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    facturaController.cambiarEstadoFactura
)

// editar las observaciones de la factura
router.patch(
    "/:id/observaciones",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    facturaController.actualizarObservaciones
)

// eliminar una factura (y sus lineas de detalle)
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    facturaController.eliminarFactura
)

module.exports = router
