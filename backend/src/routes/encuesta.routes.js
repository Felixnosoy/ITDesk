const express = require('express');

const router = express.Router();

const encuestaController = require("../controllers/encuesta.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// el cliente califica su propio ticket ya cerrado
router.post(
    "/",
    verificarRol(ROLES.CLIENTE),
    encuestaController.crearEncuesta
)

// staff ve la calificacion de cualquier ticket
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    encuestaController.obtenerEncuestaPorTicket
)

// el cliente ve la calificacion de su propio ticket (o null si no calificó)
router.get(
    "/mis/ticket/:id_ticket",
    verificarRol(ROLES.CLIENTE),
    encuestaController.obtenerMiEncuestaPorTicket
)

// listado completo, para el resumen de reportes
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR),
    encuestaController.obtenerEncuestas
)

module.exports = router
