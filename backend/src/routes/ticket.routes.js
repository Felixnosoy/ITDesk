const express = require("express");

const router = express.Router();

const ticketController = require("../controllers/ticket.controller");
const diagnosticoController = require("../controllers/diagnostico.controller");
const seguimientoController = require("../controllers/seguimiento.controller");
const estadoController = require("../controllers/estado.controller");
const cotizacionController = require("../controllers/cotizacion.controller");
const facturaController = require("../controllers/factura.controller");

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

// detalle completo del ticket: resumen, diagnostico, linea de tiempo y
// notas privadas. Cualquier rol autenticado; el Cliente solo abre los
// suyos y nunca recibe las notas privadas (lo decide el service).
router.get(
    "/:id",
    ticketController.obtenerDetalle
);

// registrar o editar el diagnostico del ticket (uno solo vigente)
router.put(
    "/:id/diagnostico",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    diagnosticoController.registrarDiagnostico
);

// cambiar el estado siguiendo las transiciones permitidas (issue HU13.1)
router.patch(
    "/:id/estado",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    estadoController.cambiarEstado
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

// cotizaciones del ticket con sus lineas: el Cliente solo las de los suyos
router.get(
    "/:id/cotizaciones",
    cotizacionController.listarCotizaciones
);

// armar la cotizacion de un ticket diagnosticado (issue HU14)
router.post(
    "/:id/cotizaciones",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    cotizacionController.crearCotizacion
);

// el cliente dueño aprueba o rechaza una cotizacion pendiente (issue HU15)
router.patch(
    "/:id/cotizaciones/:idCotizacion",
    verificarRol(ROLES.CLIENTE),
    cotizacionController.decidirCotizacion
);

// factura del ticket: el Cliente solo la de los suyos
router.get(
    "/:id/factura",
    facturaController.consultarFactura
);

// generar la factura desde la cotizacion aprobada (issue HU16)
router.post(
    "/:id/factura",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    facturaController.generarFactura
);

module.exports = router;
