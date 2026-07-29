const express = require('express');

const router = express.Router();

const equipoController = require("../controllers/equipo.controller");

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// crear un equipo

router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO, ROLES.RECEPCIONISTA),
    equipoController.crearEquipo
)

//obtener todos los equipos

router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO, ROLES.RECEPCIONISTA),
    equipoController.obtenerEquipos
)

// obtener todos los equipos de un usuario

router.get(
    "/usuario/:id_usuario",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO, ROLES.RECEPCIONISTA),
    equipoController.obtenerEquiposDeUsuarioPorId
)

// obtener equipo por su id

router.get(
    "/:id", 
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), 
    equipoController.obtenerEquipoPorId
)

// actualizar un equipo

router.put(
    "/:id", 
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), 
    equipoController.actualizarEquipo
)

// eliminar un equipo

router.delete(
    "/:id", 
    verificarRol(ROLES.ADMINISTRADOR), 
    equipoController.eliminarEquipo
)

module.exports = router