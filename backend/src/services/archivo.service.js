const fs = require("fs");
const path = require("path");
const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service");

const CARPETA_UPLOADS = path.join(__dirname, "..", "..", "uploads");

const COLUMNAS_ARCHIVO = `
    a.id_archivo,
    a.id_ticket,
    a.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    a.nombre_original,
    a.nombre_archivo,
    a.tipo_mime,
    a.tamano_bytes,
    a.publico,
    a.id_actualizacion,
    a.id_nota_privada,
    a.fecha_subida
`;

const JOIN_ARCHIVO = `
    FROM archivo_adjunto a
    INNER JOIN usuario u
        ON a.id_usuario = u.id_usuario
`;

// sube un archivo ya guardado en disco por multer (diskStorage) — este
// service solo registra la fila; el archivo fisico ya existe en CARPETA_UPLOADS.
const subirArchivo = async (datos) => {
    const { id_ticket, id_usuario, publico, archivo, id_actualizacion, id_nota_privada } = datos;

    if (!id_ticket || !id_usuario || !archivo) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    // verifica que el ticket exista (404 si no) antes de dejar el registro huerfano
    await ticketService.obtenerTicketPorId(id_ticket);

    const [resultado] = await pool.query(
        `
        INSERT INTO archivo_adjunto (
            id_ticket,
            id_usuario,
            nombre_original,
            nombre_archivo,
            tipo_mime,
            tamano_bytes,
            publico,
            id_actualizacion,
            id_nota_privada
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id_ticket,
            id_usuario,
            archivo.originalname,
            archivo.filename,
            archivo.mimetype,
            archivo.size,
            publico ? 1 : 0,
            id_actualizacion || null,
            id_nota_privada || null
        ]
    );

    return obtenerArchivoPorId(resultado.insertId);
};

// todos los adjuntos de un ticket (publicos y privados) — solo staff
const obtenerArchivosPorTicket = async (id_ticket) => {
    const [archivos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ARCHIVO}
        ${JOIN_ARCHIVO}
        WHERE a.id_ticket = ?
        ORDER BY a.id_archivo DESC
        `,
        [id_ticket]
    );

    return archivos;
};

// solo los adjuntos publicos, y solo si el ticket es del cliente que pide
const obtenerArchivosPublicosPorTicket = async (id_ticket, id_usuario_solicitante) => {
    const ticket = await ticketService.obtenerTicketPorId(id_ticket);

    if (Number(ticket.id_usuario) !== Number(id_usuario_solicitante)) {
        throw crearError("No tienes permisos para ver los archivos de este ticket.", 403);
    }

    const [archivos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ARCHIVO}
        ${JOIN_ARCHIVO}
        WHERE a.id_ticket = ? AND a.publico = 1
        ORDER BY a.id_archivo DESC
        `,
        [id_ticket]
    );

    return archivos;
};

const obtenerArchivoPorId = async (id) => {
    const [archivos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ARCHIVO}
        ${JOIN_ARCHIVO}
        WHERE a.id_archivo = ?
        `,
        [id]
    );

    if (archivos.length === 0) {
        throw crearError("Archivo no encontrado", 404);
    }

    return archivos[0];
};

// staff siempre puede; un cliente solo si el archivo es publico y el
// ticket es suyo. Devuelve la ruta fisica lista para servir.
const obtenerRutaParaDescarga = async (id, usuarioSolicitante) => {
    const archivo = await obtenerArchivoPorId(id);

    const esStaff = usuarioSolicitante.rol === "Administrador" || usuarioSolicitante.rol === "Tecnico" || usuarioSolicitante.rol === "Recepcionista";

    if (!esStaff) {
        const ticket = await ticketService.obtenerTicketPorId(archivo.id_ticket);
        const esDueno = Number(ticket.id_usuario) === Number(usuarioSolicitante.id_usuario);

        if (!archivo.publico || !esDueno) {
            throw crearError("No tienes permisos para descargar este archivo.", 403);
        }
    }

    return {
        rutaAbsoluta: path.join(CARPETA_UPLOADS, archivo.nombre_archivo),
        nombreOriginal: archivo.nombre_original
    };
};

// devuelve el archivo ya eliminado (para que quien llama, ej. el registro
// de auditoria, pueda referenciarlo por nombre sin pedirlo de nuevo)
const eliminarArchivo = async (id) => {
    const archivo = await obtenerArchivoPorId(id);

    await pool.query(`DELETE FROM archivo_adjunto WHERE id_archivo = ?`, [id]);

    const rutaAbsoluta = path.join(CARPETA_UPLOADS, archivo.nombre_archivo);
    fs.unlink(rutaAbsoluta, () => {
        // si el archivo fisico ya no estaba, no es un error para quien elimina
    });

    return archivo;
};

module.exports = {
    CARPETA_UPLOADS,
    subirArchivo,
    obtenerArchivosPorTicket,
    obtenerArchivosPublicosPorTicket,
    obtenerArchivoPorId,
    obtenerRutaParaDescarga,
    eliminarArchivo
};
