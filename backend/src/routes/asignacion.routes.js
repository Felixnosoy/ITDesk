const express = require('express');

const router = express.Router();

const asignacionController = require("../controllers/asignacion.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// asignar un tecnico a un ticket
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    asignacionController.crearAsignacion
)

// obtener todas las asignaciones
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    asignacionController.obtenerAsignaciones
)

// obtener el historial de asignaciones de un ticket
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    asignacionController.obtenerAsignacionesPorTicket
)

// obtener las asignaciones de un tecnico
router.get(
    "/tecnico/:id_tecnico",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    asignacionController.obtenerAsignacionesPorTecnico
)

// obtener una asignacion por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    asignacionController.obtenerAsignacionPorId
)

// reasignar tecnico / cambiar estado activa de una asignacion
router.put(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    asignacionController.actualizarAsignacion
)

// eliminar una asignacion
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    asignacionController.eliminarAsignacion
)

module.exports = router
