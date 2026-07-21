const express = require('express');

const router = express.Router();

const diagnosticoController = require("../controllers/diagnostico.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// crear un diagnostico para un ticket
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.crearDiagnostico
)

// obtener todos los diagnosticos
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.obtenerDiagnosticos
)

// obtener el historial de diagnosticos de un ticket
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.obtenerDiagnosticosPorTicket
)

// obtener los diagnosticos hechos por un tecnico
router.get(
    "/tecnico/:id_tecnico",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.obtenerDiagnosticosPorTecnico
)

// obtener un diagnostico por su id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.obtenerDiagnosticoPorId
)

// actualizar un diagnostico
router.put(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.actualizarDiagnostico
)

// eliminar un diagnostico
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    diagnosticoController.eliminarDiagnostico
)

module.exports = router
