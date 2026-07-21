const express = require('express');

const router = express.Router();

const ticketController = require("../controllers/ticket.controller")

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// crear tickets
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    ticketController.crearTicket
)

// obtener todos los tickets
router.get(
    "/", 
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    ticketController.obtenerTickets
)

// obtener todos los tickets de un usuario (solo staff, por id explícito)
router.get(
    "/usuario/:id_usuario",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    ticketController.obtenerTicketsDeUsuarioPorId
)

// obtener los tickets del cliente autenticado (id_usuario sale del JWT, no de la URL)
router.get(
    "/mis",
    verificarRol(ROLES.CLIENTE),
    ticketController.obtenerMisTickets
)

// obtener un ticket por un id
router.get(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), 
    ticketController.obtenerTicketPorId
)

// actualizar estado de un ticket a cerrado
router.patch(
    "/:id/cerrar",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), 
    ticketController.cerrarTicket
)

// actualizar estado del ticket (abierto, en proceso, resuelto)
router.patch(
    "/:id/estado",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO), 
    ticketController.cambiarEstadoTicket
)

module.exports = router
