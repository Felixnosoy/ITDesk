const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ROLES = require("../constants/roles");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const PRIORIDADES_TICKET = require("../constants/prioridadesTicket");
const CATEGORIAS_TICKET = require("../constants/categoriasTicket");
const ESTADOS_USUARIO = require("../constants/estadosUsuario");
const { validarId, validarTexto } = require("../validators/comun.validator");

const COLUMNAS_TICKET = `
    t.id_ticket,
    t.titulo,
    t.descripcion,
    t.estado,
    t.prioridad,
    t.categoria,
    t.fecha_apertura,
    t.fecha_resolucion,
    t.fecha_cierre,
    t.id_usuario,
    CONCAT(c.nombre, ' ', c.apellido) AS cliente,
    t.id_equipo,
    e.tipo AS equipo_tipo,
    e.marca AS equipo_marca,
    e.modelo AS equipo_modelo,
    e.numero_serie AS equipo_numero_serie,
    a.id_usuario AS id_tecnico,
    CONCAT(tec.nombre, ' ', tec.apellido) AS tecnico
`;

// LEFT JOIN con la asignacion activa: un ticket sin tecnico igual aparece
// en el listado, con id_tecnico y tecnico en null
const JOIN_TICKET = `
    FROM ticket t
    INNER JOIN usuario c
        ON t.id_usuario = c.id_usuario
    INNER JOIN equipo e
        ON t.id_equipo = e.id_equipo
    LEFT JOIN asignacion a
        ON a.id_ticket = t.id_ticket
        AND a.activa = 1
    LEFT JOIN usuario tec
        ON a.id_usuario = tec.id_usuario
`;

// filtros que acepta el listado: parametro de la URL -> columna y catalogo
const FILTROS = {
    estado: { columna: "t.estado", catalogo: Object.values(ESTADOS_TICKET) },
    prioridad: { columna: "t.prioridad", catalogo: Object.values(PRIORIDADES_TICKET) },
    categoria: { columna: "t.categoria", catalogo: Object.values(CATEGORIAS_TICKET) }
};

// Un valor fuera del catalogo responde 400 con el motivo en vez de devolver
// una lista vacia, asi un error de escritura en el frontend no pasa por
// "no hay tickets". Vacio o ausente significa sin filtro.
const validarFiltros = (filtros = {}) => {
    const validos = {};

    for (const [nombre, { catalogo }] of Object.entries(FILTROS)) {
        const valor = filtros[nombre];

        if (valor === undefined || valor === "") continue;

        if (typeof valor !== "string" || !catalogo.includes(valor)) {
            throw crearError(
                `Filtro de ${nombre} inválido. Debe ser uno de: ${catalogo.join(", ")}.`,
                400
            );
        }

        validos[nombre] = valor;
    }

    return validos;
};

// Listado de tickets segun quien consulta: el Cliente solo ve los suyos y
// el personal del taller ve todos. El id del cliente sale del token, nunca
// de un parametro, para que no pueda pedir los tickets de otro. Los filtros
// se suman a ese alcance, nunca lo amplian.
const obtenerTickets = async (usuario, filtros = {}) => {
    const condiciones = [];
    const parametros = [];

    if (usuario.rol === ROLES.CLIENTE) {
        condiciones.push("t.id_usuario = ?");
        parametros.push(usuario.id_usuario);
    }

    for (const [nombre, valor] of Object.entries(validarFiltros(filtros))) {
        condiciones.push(`${FILTROS[nombre].columna} = ?`);
        parametros.push(valor);
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(" AND ")}`
        : "";

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        ${where}
        ORDER BY t.fecha_apertura DESC, t.id_ticket DESC
        `,
        parametros
    );

    return tickets;
};

const validarCatalogo = (valor, campo, catalogo) => {
    if (typeof valor !== "string" || !catalogo.includes(valor.trim())) {
        throw crearError(`El campo ${campo} debe ser uno de: ${catalogo.join(", ")}.`, 400);
    }

    return valor.trim();
};

// Valida todo lo que llega en el body antes de tocar la base, asi un error
// de formato nunca deja nada a medias.
const validarDatosTicket = (datos = {}) => ({
    id_cliente: validarId(datos.id_cliente, "id_cliente"),
    id_equipo: validarId(datos.id_equipo, "id_equipo"),
    id_tecnico: validarId(datos.id_tecnico, "id_tecnico"),
    titulo: validarTexto(datos.titulo, "titulo", 150),
    descripcion: validarTexto(datos.descripcion, "descripcion"),
    prioridad: validarCatalogo(datos.prioridad, "prioridad", Object.values(PRIORIDADES_TICKET)),
    categoria: validarCatalogo(datos.categoria, "categoria", Object.values(CATEGORIAS_TICKET))
});

// Reglas que dependen de la base: cliente activo, equipo de ese cliente y
// tecnico activo. El tecnico es obligatorio: un ticket sin responsable no
// se crea.
const verificarReferenciasTicket = async ({ id_cliente, id_equipo, id_tecnico }) => {
    const [clientes] = await pool.query(
        "SELECT estado FROM usuario WHERE id_usuario = ? AND rol = ?",
        [id_cliente, ROLES.CLIENTE]
    );

    if (clientes.length === 0) {
        throw crearError("El cliente no existe.", 404);
    }

    if (clientes[0].estado !== ESTADOS_USUARIO.ACTIVO) {
        throw crearError("El cliente está inactivo.", 400);
    }

    const [equipos] = await pool.query(
        "SELECT id_equipo FROM equipo WHERE id_equipo = ? AND id_usuario = ?",
        [id_equipo, id_cliente]
    );

    if (equipos.length === 0) {
        throw crearError("El equipo no existe o no pertenece a este cliente.", 400);
    }

    const [tecnicos] = await pool.query(
        "SELECT id_usuario FROM usuario WHERE id_usuario = ? AND rol = ? AND estado = ?",
        [id_tecnico, ROLES.TECNICO, ESTADOS_USUARIO.ACTIVO]
    );

    if (tecnicos.length === 0) {
        throw crearError("El técnico asignado no existe o no está activo.", 400);
    }
};

// Crea el ticket a nombre de un cliente, ya asignado a un tecnico. El
// ticket y su asignacion se guardan en una sola transaccion: si falla la
// asignacion no queda un ticket sin tecnico.
const crearTicket = async (datos, id_asignado_por) => {
    const ticket = validarDatosTicket(datos);

    await verificarReferenciasTicket(ticket);

    const conexion = await pool.getConnection();
    let id_ticket;

    try {
        await conexion.beginTransaction();

        const [resultado] = await conexion.query(
            `
            INSERT INTO ticket (id_usuario, id_equipo, titulo, descripcion, prioridad, categoria, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                ticket.id_cliente,
                ticket.id_equipo,
                ticket.titulo,
                ticket.descripcion,
                ticket.prioridad,
                ticket.categoria,
                ESTADOS_TICKET.ABIERTO
            ]
        );

        id_ticket = resultado.insertId;

        await conexion.query(
            `
            INSERT INTO asignacion (id_ticket, id_usuario, id_asignado_por)
            VALUES (?, ?, ?)
            `,
            [id_ticket, ticket.id_tecnico, id_asignado_por]
        );

        await conexion.commit();
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [id_ticket]
    );

    return tickets[0];
};

module.exports = {
    obtenerTickets,
    crearTicket
};
