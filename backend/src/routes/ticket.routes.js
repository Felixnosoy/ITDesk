const express = require("express");

const router = express.Router();

const ticketController = require("../controllers/ticket.controller");

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");

const ROLES = require("../constants/roles");

router.use(autenticarToken);

// listado de tickets: cualquier rol autenticado, el alcance (propios o
// todos) lo decide el service segun el rol del token.
// Filtros opcionales: ?estado=&prioridad=&categoria=
router.get(
    "/",
    ticketController.obtenerTickets
);

// registrar un ticket a nombre de un cliente, con tecnico obligatorio. Lo
// hace el personal del taller despues de que el cliente reporta el problema
// en persona; el Cliente no crea tickets.
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.RECEPCIONISTA, ROLES.TECNICO),
    ticketController.crearTicket
);

module.exports = router;
