const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

const archivoController = require("../controllers/archivo.controller");
const archivoService = require("../services/archivo.service");

const autenticarToken = require("../middleware/auth.middleware");
const verificarRol = require("../middleware/rol.middleware");
const crearError = require("../utils/crearError");

const ROLES = require("../constants/roles");

// se crea la carpeta de subida si todavia no existe (primer arranque)
fs.mkdirSync(archivoService.CARPETA_UPLOADS, { recursive: true });

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, archivoService.CARPETA_UPLOADS),
    filename: (req, file, cb) => {
        // nombre fisico generado (no el original) para evitar colisiones y
        // path traversal — el nombre original se guarda aparte en la BD.
        const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${sufijo}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: TAMANO_MAXIMO_BYTES },
    fileFilter: (req, file, cb) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
            return cb(crearError("Tipo de archivo no permitido. Solo imágenes (JPG, PNG, WEBP, GIF) o PDF.", 400));
        }
        cb(null, true);
    }
});

router.use(autenticarToken);

// subir un archivo para un ticket
router.post(
    "/",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    (req, res, next) => {
        upload.single("archivo")(req, res, (error) => {
            if (error) {
                const status = error instanceof multer.MulterError ? 400 : (error.status || 400);
                return res.status(status).json({ success: false, message: error.message });
            }
            next();
        });
    },
    archivoController.subirArchivo
);

// todos los adjuntos de un ticket (publicos y privados)
router.get(
    "/ticket/:id_ticket",
    verificarRol(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    archivoController.obtenerArchivosPorTicket
);

// adjuntos publicos de uno de mis propios tickets (cualquier rol autenticado)
router.get(
    "/mis/ticket/:id_ticket",
    archivoController.obtenerMisArchivosPorTicket
);

// descargar un archivo — el control de acceso real vive en el service
router.get(
    "/:id/descargar",
    archivoController.descargarArchivo
);

// eliminar un archivo
router.delete(
    "/:id",
    verificarRol(ROLES.ADMINISTRADOR),
    archivoController.eliminarArchivo
);

module.exports = router;
