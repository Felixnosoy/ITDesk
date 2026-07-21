const express = require('express');

const router = express.Router();

const actualizacionController = require("../controllers/actualizacion.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// registrar una actualizacion de estado para un ticket
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    actualizacionController.crearActualizacion
)

// obtener todas las actualizaciones
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    actualizacionController.obtenerActualizaciones
)

// obtener el historial de actualizaciones de un ticket
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    actualizacionController.obtenerActualizacionesPorTicket
)

// obtener las actualizaciones hechas por un usuario del staff
router.get(
    "/usuario/:id_usuario",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    actualizacionController.obtenerActualizacionesPorUsuario
)

// el cliente ve las notas de progreso (publicas) de su propio ticket
router.get(
    "/notas/:id_ticket",
    verificarRol(ROLES.CLIENTE),
    actualizacionController.obtenerMisNotasProgreso
)

// obtener una actualizacion por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    actualizacionController.obtenerActualizacionPorId
)

// actualizar una actualizacion
router.put(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    actualizacionController.actualizarActualizacion
)

// eliminar una actualizacion
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    actualizacionController.eliminarActualizacion
)

module.exports = router
