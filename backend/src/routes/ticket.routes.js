const express = require("express");

const router = express.Router();

const ticketController = require("../controllers/ticket.controller");
const diagnosticoController = require("../controllers/diagnostico.controller");
const seguimientoController = require("../controllers/seguimiento.controller");

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");
const subirImagenes = require("../middleware/subida.middleware");

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

// registrar o editar el diagnostico del ticket (uno solo vigente)
router.put(
    "/:id/diagnostico",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.registrarDiagnostico
);

// avance publico: lo escribe el taller y lo ve tambien el cliente.
// JSON o multipart con hasta 5 imagenes en el campo "imagenes".
router.post(
    "/:id/actualizaciones",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    subirImagenes,
    seguimientoController.crearActualizacion
);

// nota privada: solo el taller la escribe y la ve (imagenes igual que arriba)
router.post(
    "/:id/notas",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    subirImagenes,
    seguimientoController.crearNota
);

module.exports = router;
