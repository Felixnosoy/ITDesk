const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ROLES = require("../constants/roles");
const { validarId } = require("../validators/comun.validator");

const CARPETA_UPLOADS = path.join(__dirname, "..", "..", "uploads");

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
const MAXIMO_IMAGENES = 5;

// Firma (primeros bytes) de cada formato admitido. El tipo que declara el
// navegador se puede falsificar; el contenido del archivo no.
const FIRMAS = [
    { tipo: "image/png", extension: ".png", coincide: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { tipo: "image/jpeg", extension: ".jpg", coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    { tipo: "image/gif", extension: ".gif", coincide: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
    { tipo: "image/webp", extension: ".webp", coincide: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" }
];

const TIPOS_IMAGEN = FIRMAS.map((f) => f.tipo);

// Revisa el contenido real de cada imagen antes de tocar la base. Devuelve
// los datos listos para guardar, con el tipo detectado (no el declarado).
const validarImagenes = (archivos = []) =>
    archivos.map((archivo) => {
        const firma = FIRMAS.find((f) => f.coincide(archivo.buffer));

        if (!firma) {
            throw crearError(`El archivo "${archivo.originalname}" no es una imagen válida.`, 400);
        }

        return {
            buffer: archivo.buffer,
            nombre_original: path.basename(archivo.originalname).slice(0, 255),
            tipo_mime: firma.tipo,
            extension: firma.extension,
            tamano_bytes: archivo.size
        };
    });

// Escribe las imagenes en disco con un nombre generado e inserta sus filas
// usando la conexion de la transaccion del padre (actualizacion o nota).
// Devuelve las rutas escritas para que quien llama las borre si la
// transaccion se deshace.
const guardarAdjuntos = async (conexion, imagenes, { id_ticket, id_usuario, id_actualizacion = null, id_nota = null }) => {
    const rutas = [];

    if (imagenes.length === 0) return rutas;

    await fs.mkdir(CARPETA_UPLOADS, { recursive: true });

    for (const imagen of imagenes) {
        const nombre_archivo = `${crypto.randomUUID()}${imagen.extension}`;
        const ruta = path.join(CARPETA_UPLOADS, nombre_archivo);

        await fs.writeFile(ruta, imagen.buffer);
        rutas.push(ruta);

        await conexion.query(
            `
            INSERT INTO archivo_adjunto
                (id_ticket, id_usuario, id_actualizacion, id_nota, nombre_original, nombre_archivo, tipo_mime, tamano_bytes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [id_ticket, id_usuario, id_actualizacion, id_nota, imagen.nombre_original, nombre_archivo, imagen.tipo_mime, imagen.tamano_bytes]
        );
    }

    return rutas;
};

// borra archivos escritos por una transaccion que no se confirmo
const borrarArchivos = async (rutas) => {
    await Promise.all(rutas.map((ruta) => fs.unlink(ruta).catch(() => {})));
};

// Adjuntos de varias actualizaciones o notas a la vez, agrupados por el id
// del padre. columna es "id_actualizacion" o "id_nota". Nunca devuelve el
// nombre en disco: el frontend descarga por url.
const obtenerAdjuntosPorPadre = async (columna, ids) => {
    const agrupados = new Map(ids.map((id) => [id, []]));

    if (ids.length === 0) return agrupados;

    const [archivos] = await pool.query(
        `
        SELECT id_archivo, ${columna} AS id_padre, nombre_original, tipo_mime, tamano_bytes, fecha_subida
        FROM archivo_adjunto
        WHERE ${columna} IN (?)
        ORDER BY id_archivo
        `,
        [ids]
    );

    for (const { id_padre, ...archivo } of archivos) {
        agrupados.get(id_padre)?.push({ ...archivo, url: `/api/archivos/${archivo.id_archivo}` });
    }

    return agrupados;
};

// Archivo para descargar. El personal del taller descarga cualquiera; el
// Cliente solo los publicos (de una actualizacion) de sus propios tickets.
// Lo demas responde 404 igual que un id inexistente.
const obtenerArchivoParaDescarga = async (idArchivo, usuario) => {
    const id_archivo = validarId(idArchivo, "id_archivo");

    const [archivos] = await pool.query(
        `
        SELECT a.nombre_original, a.nombre_archivo, a.tipo_mime, a.id_actualizacion, t.id_usuario AS id_cliente
        FROM archivo_adjunto a
        INNER JOIN ticket t
            ON a.id_ticket = t.id_ticket
        WHERE a.id_archivo = ?
        `,
        [id_archivo]
    );

    const archivo = archivos[0];
    const clienteSinPermiso = usuario.rol === ROLES.CLIENTE
        && (archivo?.id_cliente !== usuario.id_usuario || archivo?.id_actualizacion === null);

    if (!archivo || clienteSinPermiso) {
        throw crearError("Archivo no encontrado.", 404);
    }

    return {
        ruta: path.join(CARPETA_UPLOADS, archivo.nombre_archivo),
        nombre_original: archivo.nombre_original,
        tipo_mime: archivo.tipo_mime
    };
};

module.exports = {
    TIPOS_IMAGEN,
    TAMANO_MAXIMO_BYTES,
    MAXIMO_IMAGENES,
    validarImagenes,
    guardarAdjuntos,
    borrarArchivos,
    obtenerAdjuntosPorPadre,
    obtenerArchivoParaDescarga
};
