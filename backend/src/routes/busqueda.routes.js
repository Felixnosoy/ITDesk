const express = require("express");
const router = express.Router();
const busquedaController = require("../controllers/busqueda.controller");
const autenticarToken = require("../middleware/auth.middleware");

router.use(autenticarToken);

// busqueda global: ?q= (minimo 2 caracteres). Todos los roles; el alcance
// de cada uno lo decide el service
router.get("/", busquedaController.buscar);

module.exports = router;
