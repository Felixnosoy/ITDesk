const express = require("express");

const router = express.Router();

const archivoController = require("../controllers/archivo.controller");

const autenticarToken = require("../middleware/auth.middleware");

router.use(autenticarToken);

// descargar un adjunto: cualquier rol autenticado; que el Cliente solo vea
// los publicos de sus tickets lo decide el service
router.get(
    "/:id",
    archivoController.descargarArchivo
);

module.exports = router;
