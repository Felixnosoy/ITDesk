const express = require('express');

const router = express.Router();

const especialidadController = require("../controllers/especialidad.controller");

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// catalogo completo de especialidades — cualquier rol autenticado (se usa
// tanto en la gestion de Admin como en el formulario de agendar visita)
router.get(
    "/",
    especialidadController.obtenerEspecialidades
)

// crear una especialidad nueva en el catalogo
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR),
    especialidadController.crearEspecialidad
)

// renombrar una especialidad existente
router.put(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    especialidadController.actualizarEspecialidad
)

// eliminar una especialidad (rechaza si algun tecnico la tiene asignada)
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    especialidadController.eliminarEspecialidad
)

module.exports = router
