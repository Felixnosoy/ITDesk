const express = require('express');

const router = express.Router();

const cotizacionController = require("../controllers/cotizacion.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// crear una cotizacion (vacia, en estado Pendiente) para un cliente
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    cotizacionController.crearCotizacion
)

// obtener todas las cotizaciones
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    cotizacionController.obtenerCotizaciones
)

// obtener las cotizaciones del cliente autenticado
router.get(
    "/mis",
    verificarRol(ROLES.CLIENTE),
    cotizacionController.obtenerMisCotizaciones
)

// obtener el detalle de una cotizacion propia del cliente autenticado
router.get(
    "/mis/:id",
    verificarRol(ROLES.CLIENTE),
    cotizacionController.obtenerMiCotizacionPorId
)

// obtener las cotizaciones de un cliente en especifico
router.get(
    "/usuario/:id_usuario",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    cotizacionController.obtenerCotizacionesPorUsuario
)

// obtener una cotizacion (con su detalle) por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    cotizacionController.obtenerCotizacionPorId
)

// actualizar el descuento global de la cotizacion (recalcula itbis/total)
router.patch(
    "/:id/descuento",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    cotizacionController.actualizarDescuentoTotal
)

// aprobar, rechazar o vencer una cotizacion
router.patch(
    "/:id/estado",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    cotizacionController.cambiarEstadoCotizacion
)

// eliminar una cotizacion (y sus lineas de detalle)
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    cotizacionController.eliminarCotizacion
)

module.exports = router
