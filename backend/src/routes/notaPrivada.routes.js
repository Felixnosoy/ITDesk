const express = require('express');

const router = express.Router();

const notaPrivadaController = require("../controllers/notaPrivada.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// Cliente nunca tiene acceso a ninguna ruta de este modulo — a diferencia
// de actualizacion, no hay ninguna version "publica" de una nota privada.

// crear una nota privada para un ticket
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    notaPrivadaController.crearNota
)

// obtener las notas privadas de un ticket
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    notaPrivadaController.obtenerNotasPorTicket
)

module.exports = router
