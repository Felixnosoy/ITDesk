const express = require('express');

const router = express.Router();

const auditoriaController = require("../controllers/auditoria.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// Sin POST propio: los eventos se registran internamente desde otros
// services (ticket, usuario, asignacion, cotizacion, factura, archivo), no
// vía un endpoint que cualquiera pueda llamar — asi nadie puede fabricar
// una entrada de auditoria falsa.
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    auditoriaController.obtenerEventos
)

module.exports = router
