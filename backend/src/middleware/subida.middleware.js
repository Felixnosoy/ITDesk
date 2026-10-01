const multer = require("multer");
const crearError = require("../utils/crearError");
const { TIPOS_IMAGEN, TAMANO_MAXIMO_BYTES, MAXIMO_IMAGENES } = require("../services/archivo.service");

// Los archivos quedan en memoria hasta que el service valida su contenido
// y guarda la fila en la base: asi un rechazo no deja archivos sueltos en
// disco. Con 5 imagenes de 5 MB el peor caso son 25 MB por request.
const subir = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: TAMANO_MAXIMO_BYTES,
        files: MAXIMO_IMAGENES
    },
    fileFilter: (req, archivo, cb) => {
        if (!TIPOS_IMAGEN.includes(archivo.mimetype)) {
            return cb(crearError("Solo se admiten imágenes PNG, JPG, GIF o WEBP.", 400));
        }
        cb(null, true);
    }
}).array("imagenes", MAXIMO_IMAGENES);

const MENSAJES_MULTER = {
    LIMIT_FILE_SIZE: `Cada imagen puede pesar como máximo ${TAMANO_MAXIMO_BYTES / 1024 / 1024} MB.`,
    LIMIT_FILE_COUNT: `Se admiten como máximo ${MAXIMO_IMAGENES} imágenes.`,
    LIMIT_UNEXPECTED_FILE: `Las imágenes se envían en el campo "imagenes", hasta ${MAXIMO_IMAGENES}.`
};

// Acepta multipart/form-data con imagenes opcionales en el campo "imagenes".
// Un body JSON pasa sin cambios. Los errores de multer se traducen a 400
// con un mensaje legible en vez de caer en el manejador generico.
const subirImagenes = (req, res, next) => {
    subir(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            const mensaje = MENSAJES_MULTER[error.code] ?? "No se pudo procesar el archivo enviado.";
            return next(crearError(mensaje, 400));
        }

        next(error.status ? error : crearError("No se pudo procesar el archivo enviado.", 400));
    });
};

module.exports = subirImagenes;
