const express = require('express');

const router = express.Router();

const usuarioController = require('../controllers/usuario.controller')

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// crear usuario
router.post(
    '/',
    verificarRol(ROLES.ADMINISTRADOR),
    usuarioController.crearUsuario
)

// obtener todos los usuarios
router.get(
    '/', 
    verificarRol(ROLES.ADMINISTRADOR), 
    usuarioController.obtenerUsuarios
)

// obtener usuario por su id
router.get(
    '/:id', 
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), 
    usuarioController.obtenerUsuarioPorId
)

//actualizar usuario
router.put(
    '/:id', 
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), 
    usuarioController.actualizarUsuario
)

// actualizar estado de usuario
router.patch(
    "/:id/estado", 
    verificarRol(ROLES.ADMINISTRADOR), 
    usuarioController.actualizarEstadoUsuario
)

// eliminar usuario
router.delete(
    "/:id", 
    verificarRol(ROLES.ADMINISTRADOR), 
    usuarioController.borrarUsuario
)

module.exports = router;