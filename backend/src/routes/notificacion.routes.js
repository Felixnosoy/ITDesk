const express = require('express');

const router = express.Router();

const notificacionController = require("../controllers/notificacion.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// crear una notificacion para un usuario sobre un ticket
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    notificacionController.crearNotificacion
)

// obtener todas las notificaciones
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    notificacionController.obtenerNotificaciones
)

// obtener mis notificaciones (cualquier rol autenticado, son las propias)
router.get(
    "/mis",
    notificacionController.obtenerMisNotificaciones
)

// marcar como leida una notificacion propia (cualquier rol autenticado)
router.patch(
    "/mis/:id/leida",
    notificacionController.marcarMiNotificacionComoLeida
)

// marcar todas las notificaciones propias como leidas (cualquier rol autenticado)
router.patch(
    "/mis/leidas",
    notificacionController.marcarTodasMisNotificacionesComoLeidas
)

// obtener las notificaciones de un ticket en especifico
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    notificacionController.obtenerNotificacionesPorTicket
)

// obtener las notificaciones de un usuario en especifico
router.get(
    "/usuario/:id_usuario",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    notificacionController.obtenerNotificacionesPorUsuario
)

// obtener una notificacion por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    notificacionController.obtenerNotificacionPorId
)

// eliminar una notificacion
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    notificacionController.eliminarNotificacion
)

module.exports = router
