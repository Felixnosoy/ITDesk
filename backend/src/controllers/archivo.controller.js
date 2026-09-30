const archivoService = require("../services/archivo.service");
const responder = require("../utils/respuesta");

// Envia la imagen con su tipo real. nosniff evita que el navegador trate
// el archivo como otra cosa; inline permite mostrarla en la pagina.
const descargarArchivo = async (req, res) => {
    try {
        const archivo = await archivoService.obtenerArchivoParaDescarga(req.params.id, req.usuario);

        res.set("X-Content-Type-Options", "nosniff");
        res.set("Cache-Control", "private, max-age=3600");
        res.type(archivo.tipo_mime);
        res.attachment(archivo.nombre_original);
        res.set("Content-Disposition", res.get("Content-Disposition").replace(/^attachment/, "inline"));

        res.sendFile(archivo.ruta, (error) => {
            // la fila existe pero el archivo ya no esta en disco
            if (error && !res.headersSent) {
                res.removeHeader("Content-Disposition");
                responder(res, 404, { message: "Archivo no encontrado." });
            }
        });

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        });
    }
};

module.exports = {
    descargarArchivo
};
