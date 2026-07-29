const express = require('express');

const router = express.Router();

const detalleCotizacionController = require("../controllers/detalleCotizacion.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// agregar una linea a una cotizacion
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleCotizacionController.crearDetalleCotizacion
)

// obtener todas las lineas de detalle
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleCotizacionController.obtenerDetallesCotizacion
)

// obtener las lineas de una cotizacion en especifico
router.get(
    "/cotizacion/:id_cotizacion",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleCotizacionController.obtenerDetallesPorCotizacion
)

// obtener las lineas de cotizacion relacionadas a un ticket
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleCotizacionController.obtenerDetallesPorTicket
)

// el cliente ve las lineas de cotizacion de su propio ticket
router.get(
    "/mis/ticket/:id_ticket",
    verificarRol(ROLES.CLIENTE),
    detalleCotizacionController.obtenerMisDetallesPorTicket
)

// obtener una linea por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleCotizacionController.obtenerDetalleCotizacionPorId
)

// actualizar una linea
router.put(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleCotizacionController.actualizarDetalleCotizacion
)

// eliminar una linea
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    detalleCotizacionController.eliminarDetalleCotizacion
)

module.exports = router
