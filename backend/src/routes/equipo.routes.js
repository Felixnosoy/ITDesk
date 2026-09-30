const express = require("express");

const router = express.Router();

const equipoController = require("../controllers/equipo.controller");

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// equipos de un cliente: ?id_cliente= (obligatorio). Solo personal del
// taller; la consulta de los equipos propios del cliente es otra historia.
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA, ROLES.TECNICO),
    equipoController.obtenerEquipos
);

// registrar un equipo a nombre de un cliente (Recepcion, Admin de respaldo)
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA),
    equipoController.crearEquipo
);

module.exports = router;
