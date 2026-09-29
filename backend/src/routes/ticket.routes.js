const express = require("express");

const router = express.Router();

const ticketController = require("../controllers/ticket.controller");

const autenticarToken = require("../middleware/auth.middleware");

router.use(autenticarToken);

// listado de tickets: cualquier rol autenticado, el alcance (propios o
// todos) lo decide el service segun el rol del token
router.get(
    "/",
    ticketController.obtenerTickets
);

module.exports = router;
