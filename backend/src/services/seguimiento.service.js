const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ticketService = require("./ticket.service");
const archivoService = require("./archivo.service");
const { validarTexto } = require("../validators/comun.validator");

// Seguimiento del ticket: actualizaciones publicas (las ve el cliente) y
// notas privadas (solo el taller).

const TIPOS_ACTUALIZACION = {
    AVANCE: "Avance",
    ESTADO: "Estado"
};

const COLUMNAS_ACTUALIZACION = `
    a.id_actualizacion,
    a.id_ticket,
    a.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    a.tipo,
    a.estado,
    a.observaciones,
    a.fecha
`;

const COLUMNAS_NOTA = `
    n.id_nota,
    n.id_ticket,
    n.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS usuario,
    n.contenido,
    n.fecha
`;

// un ticket cerrado ya no recibe avances ni notas
const obtenerTicketAbierto = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);

    if (ticket.estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket está cerrado y ya no admite novedades.", 400);
    }

    return ticket;
};

const obtenerActualizaciones = async (id_ticket, condicion = "a.id_ticket = ?", parametro = id_ticket) => {
    const [actualizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_ACTUALIZACION}
        FROM actualizacion a
        INNER JOIN usuario u
            ON a.id_usuario = u.id_usuario
        WHERE ${condicion}
        ORDER BY a.fecha ASC, a.id_actualizacion ASC
        `,
        [parametro]
    );

    return actualizaciones;
};

const obtenerNotas = async (id_ticket, condicion = "n.id_ticket = ?", parametro = id_ticket) => {
    const [notas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_NOTA}
        FROM nota_privada n
        INNER JOIN usuario u
            ON n.id_usuario = u.id_usuario
        WHERE ${condicion}
        ORDER BY n.fecha ASC, n.id_nota ASC
        `,
        [parametro]
    );

    return notas;
};

// Guarda el padre (actualizacion o nota) y sus imagenes en una sola
// transaccion. Si algo falla se deshace la fila y se borran del disco las
// imagenes que ya se habian escrito.
const guardarConAdjuntos = async ({ ticket, usuario, imagenes, insertarPadre, columnaPadre }) => {
    const conexion = await pool.getConnection();
    let rutas = [];

    try {
        await conexion.beginTransaction();

        const [resultado] = await insertarPadre(conexion);
        const idPadre = resultado.insertId;

        rutas = await archivoService.guardarAdjuntos(conexion, imagenes, {
            id_ticket: ticket.id_ticket,
            id_usuario: usuario.id_usuario,
            [columnaPadre]: idPadre
        });

        await conexion.commit();

        return idPadre;
    } catch (error) {
        await conexion.rollback();
        await archivoService.borrarArchivos(rutas);
        throw error;
    } finally {
        conexion.release();
    }
};

// Avance publico escrito por el tecnico, con imagenes opcionales. Guarda
// el estado que tenia el ticket en ese momento, para que la linea de
// tiempo lo muestre.
const crearActualizacion = async (idTicket, datos = {}, usuario, archivos = []) => {
    const observaciones = validarTexto(datos.observaciones, "observaciones");
    const imagenes = archivoService.validarImagenes(archivos);
    const ticket = await obtenerTicketAbierto(idTicket, usuario);

    const id = await guardarConAdjuntos({
        ticket,
        usuario,
        imagenes,
        columnaPadre: "id_actualizacion",
        insertarPadre: (conexion) => conexion.query(
            `
            INSERT INTO actualizacion (id_ticket, id_usuario, tipo, estado, observaciones)
            VALUES (?, ?, ?, ?, ?)
            `,
            [ticket.id_ticket, usuario.id_usuario, TIPOS_ACTUALIZACION.AVANCE, ticket.estado, observaciones]
        )
    });

    const [actualizacion] = await obtenerActualizaciones(null, "a.id_actualizacion = ?", id);
    const adjuntos = await archivoService.obtenerAdjuntosPorPadre("id_actualizacion", [id]);

    return { ...actualizacion, adjuntos: adjuntos.get(id) };
};

// Nota interna del taller, con imagenes opcionales: nunca se devuelve al
// cliente, y sus imagenes tampoco.
const crearNota = async (idTicket, datos = {}, usuario, archivos = []) => {
    const contenido = validarTexto(datos.contenido, "contenido");
    const imagenes = archivoService.validarImagenes(archivos);
    const ticket = await obtenerTicketAbierto(idTicket, usuario);

    const id = await guardarConAdjuntos({
        ticket,
        usuario,
        imagenes,
        columnaPadre: "id_nota",
        insertarPadre: (conexion) => conexion.query(
            `
            INSERT INTO nota_privada (id_ticket, id_usuario, contenido)
            VALUES (?, ?, ?)
            `,
            [ticket.id_ticket, usuario.id_usuario, contenido]
        )
    });

    const [nota] = await obtenerNotas(null, "n.id_nota = ?", id);
    const adjuntos = await archivoService.obtenerAdjuntosPorPadre("id_nota", [id]);

    return { ...nota, adjuntos: adjuntos.get(id) };
};

module.exports = {
    TIPOS_ACTUALIZACION,
    obtenerActualizaciones,
    obtenerNotas,
    crearActualizacion,
    crearNota
};
