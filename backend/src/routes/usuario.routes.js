const express = require('express');

const router = express.Router();

const usuarioController = require('../controllers/usuario.controller')

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// crear usuario (Recepcionista solo puede crear clientes, ver controller)
router.post(
    '/',
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA),
    usuarioController.crearUsuario
)

// obtener todos los usuarios
router.get(
    '/',
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA),
    usuarioController.obtenerUsuarios
)

// obtener usuario por su id (staff ve cualquiera; el resto solo su propia
// cuenta — chequeo de ownership adentro del controller)
router.get(
    '/:id',
    usuarioController.obtenerUsuarioPorId
)

// actualizar usuario (incluye rol) — Administrador unicamente. Tecnico
// nunca tuvo un uso real de esto (ningun frontend lo llama para ese rol)
// y dejarlo abierto permitia que cualquier Tecnico se auto-ascendiera
// mandando { rol: "Administrador" } en el body, ya que este endpoint no
// filtra el campo rol como si hace crearUsuario para Recepcionista.
router.put(
    '/:id',
    verificarRol(ROLES.ADMINISTRADOR),
    usuarioController.actualizarUsuario
)

// actualizar estado de usuario
router.patch(
    "/:id/estado",
    verificarRol(ROLES.ADMINISTRADOR),
    usuarioController.actualizarEstadoUsuario
)

// cambiar la propia contraseña (cualquier rol autenticado, solo su propia cuenta)
router.patch(
    "/:id/clave",
    usuarioController.cambiarContrasena
)

// resetear la contraseña de otro usuario, sin conocer la actual
router.patch(
    "/:id/clave/reset",
    verificarRol(ROLES.ADMINISTRADOR),
    usuarioController.resetearContrasena
)

// editar el propio perfil (telefono/direccion), cualquier rol autenticado,
// solo sobre la propia cuenta (chequeo adentro del controller)
router.patch(
    "/:id/perfil",
    usuarioController.actualizarPerfilPropio
)

module.exports = router;