const express = require("express");

const router = express.Router();

const { obtenerEstadisticasPublicas } = require("../controllers/estadisticas.controller");

// Sin autenticarToken a proposito — es la unica pantalla del sistema sin
// sesion (index.html) y solo expone 4 conteos agregados, nunca una fila
// individual. Ver health.routes.js para el mismo criterio de ruta publica.
router.get("/publicas", obtenerEstadisticasPublicas);

module.exports = router;
