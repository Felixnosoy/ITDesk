const express = require('express');

const router = express.Router();

const visitaController = require("../controllers/visita.controller");

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// el cliente solicita una visita tecnica
router.post(
    "/",
    verificarRol(ROLES.CLIENTE),
    visitaController.crearVisita
)

// todas las visitas — alimenta el calendario de Recepcion
router.get(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA, ROLES.TECNICO),
    visitaController.obtenerVisitas
)

// las visitas del cliente autenticado
router.get(
    "/mis",
    verificarRol(ROLES.CLIENTE),
    visitaController.obtenerMisVisitas
)

// las visitas asignadas al tecnico autenticado
router.get(
    "/tecnico/mis",
    verificarRol(ROLES.TECNICO),
    visitaController.obtenerVisitasTecnico
)

// tecnicos con la especialidad pedida + sus horarios ya ocupados ese dia
router.get(
    "/disponibilidad",
    visitaController.obtenerDisponibilidad
)

// detalle de una visita puntual
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA, ROLES.TECNICO),
    visitaController.obtenerVisitaPorId
)

// confirma la visita: asigna tecnico y vincula/crea el ticket
router.patch(
    "/:id/confirmar",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA),
    visitaController.confirmarVisita
)

// cambia fecha/hora, vuelve a Reprogramada
router.patch(
    "/:id/reprogramar",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA),
    visitaController.reprogramarVisita
)

// cambia o reasigna el tecnico responsable
router.patch(
    "/:id/asignar",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA),
    visitaController.asignarTecnicoVisita
)

// cancela la visita — staff en cualquier momento no-terminal, el cliente
// solo sobre la propia mientras siga Pendiente/Confirmada
router.patch(
    "/:id/cancelar",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA, ROLES.CLIENTE),
    visitaController.cancelarVisita
)

// el tecnico actualiza el estado de su propia visita (En camino/En
// progreso/Finalizada)
router.patch(
    "/:id/estado",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    visitaController.cambiarEstadoVisita
)

module.exports = router
