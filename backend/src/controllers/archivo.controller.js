const archivoService = require("../services/archivo.service");
const auditoriaService = require("../services/auditoria.service");
const responder = require("../utils/respuesta");

const subirArchivo = async (req, res) => {
    try {
        const { id_ticket, publico, id_actualizacion, id_nota_privada } = req.body;
        const { id_usuario } = req.usuario;

        if (!req.file) {
            return responder(res, 400, { message: "No se recibió ningún archivo." });
        }

        const archivo = await archivoService.subirArchivo({
            id_ticket,
            id_usuario,
            publico: publico === "true" || publico === true,
            archivo: req.file,
            id_actualizacion: id_actualizacion || null,
            id_nota_privada: id_nota_privada || null
        });

        responder(res, 200, {
            message: "Archivo subido exitosamente",
            data: archivo
        });

    } catch (error) {
        responder(res, error.status || 500, { message: error.message });
    }
};

const obtenerArchivosPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params;
        const archivos = await archivoService.obtenerArchivosPorTicket(id_ticket);

        responder(res, 200, { data: archivos });

    } catch (error) {
        responder(res, error.status || 500, { message: error.message });
    }
};

// el cliente nunca envía su id_usuario: se toma del JWT ya validado
const obtenerMisArchivosPorTicket = async (req, res) => {
    try {
        const { id_ticket } = req.params;
        const { id_usuario } = req.usuario;

        const archivos = await archivoService.obtenerArchivosPublicosPorTicket(id_ticket, id_usuario);

        responder(res, 200, { data: archivos });

    } catch (error) {
        responder(res, error.status || 500, { message: error.message });
    }
};

const descargarArchivo = async (req, res) => {
    try {
        const { id } = req.params;

        const { rutaAbsoluta, nombreOriginal } = await archivoService.obtenerRutaParaDescarga(id, req.usuario);

        res.download(rutaAbsoluta, nombreOriginal, (error) => {
            if (error && !res.headersSent) {
                responder(res, 404, { message: "No se pudo descargar el archivo." });
            }
        });

    } catch (error) {
        responder(res, error.status || 500, { message: error.message });
    }
};

const eliminarArchivo = async (req, res) => {
    try {
        const { id } = req.params;
        const archivo = await archivoService.eliminarArchivo(id);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "ARCHIVO_ELIMINADO",
            descripcion: `Eliminó el archivo "${archivo.nombre_original}" del ticket #${archivo.id_ticket}.`,
            id_ticket: archivo.id_ticket
        });

        responder(res, 200, { message: "Archivo eliminado exitosamente" });

    } catch (error) {
        responder(res, error.status || 500, { message: error.message });
    }
};

module.exports = {
    subirArchivo,
    obtenerArchivosPorTicket,
    obtenerMisArchivosPorTicket,
    descargarArchivo,
    eliminarArchivo
};
