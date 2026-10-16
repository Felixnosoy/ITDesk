const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ROLES = require("../constants/roles");

// Busqueda global de la barra superior: un texto y, agrupados, los tickets,
// equipos, clientes y personal que coinciden. Cada grupo trae pocos
// resultados (es para saltar rapido, no un listado) y respeta lo que cada
// rol ya puede ver en el resto del sistema:
// - Cliente: solo sus tickets y sus equipos, nunca otras personas
// - Tecnico y Recepcion: todos los tickets, equipos y clientes
// - Administrador: ademas el personal del taller

const MINIMO = 2;
const MAXIMO = 80;
const POR_GRUPO = 6;

// % y _ son comodines de LIKE: escritos por el usuario se buscan literales
const patron = (texto) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// "TK-0004", "tk4" o "4" tambien buscan el ticket por su numero
const numeroTicket = (texto) => {
    const coincidencia = /^(?:tk-?)?0*(\d{1,9})$/i.exec(texto);
    return coincidencia ? Number(coincidencia[1]) : null;
};

const validarTexto = (q) => {
    const texto = typeof q === "string" ? q.trim() : "";

    if (texto.length < MINIMO) {
        throw crearError(`Escribe al menos ${MINIMO} caracteres para buscar.`, 400);
    }
    if (texto.length > MAXIMO) {
        throw crearError(`La búsqueda admite hasta ${MAXIMO} caracteres.`, 400);
    }

    return texto;
};

const buscarTickets = async (texto, usuario) => {
    const like = patron(texto);
    const condiciones = [
        `(t.titulo LIKE ? OR t.descripcion LIKE ? OR CONCAT(c.nombre, ' ', c.apellido) LIKE ?
          OR e.numero_serie LIKE ? OR CONCAT(e.marca, ' ', e.modelo) LIKE ? OR t.id_ticket = ?)`,
    ];
    const numero = numeroTicket(texto) ?? 0;
    const parametros = [like, like, like, like, like, numero];

    if (usuario.rol === ROLES.CLIENTE) {
        condiciones.push("t.id_usuario = ?");
        parametros.push(usuario.id_usuario);
    }

    const [filas] = await pool.query(
        `
        SELECT
            t.id_ticket,
            t.titulo,
            t.estado,
            CONCAT(c.nombre, ' ', c.apellido) AS cliente,
            e.marca AS equipo_marca,
            e.modelo AS equipo_modelo
        FROM ticket t
        INNER JOIN usuario c
            ON t.id_usuario = c.id_usuario
        INNER JOIN equipo e
            ON t.id_equipo = e.id_equipo
        WHERE ${condiciones.join(" AND ")}
        ORDER BY t.id_ticket = ? DESC, t.fecha_apertura DESC, t.id_ticket DESC
        LIMIT ${POR_GRUPO}
        `,
        // el ticket cuyo numero se escribio va primero, antes de los que solo
        // coinciden por el titulo (idea tomada del PR #280)
        [...parametros, numero]
    );

    return filas;
};

const buscarEquipos = async (texto, usuario) => {
    const like = patron(texto);
    const condiciones = [
        "(e.numero_serie LIKE ? OR e.marca LIKE ? OR e.modelo LIKE ? OR CONCAT(e.marca, ' ', e.modelo) LIKE ? OR e.tipo LIKE ?)",
    ];
    const parametros = [like, like, like, like, like];

    if (usuario.rol === ROLES.CLIENTE) {
        condiciones.push("e.id_usuario = ?");
        parametros.push(usuario.id_usuario);
    }

    // el ultimo ticket del equipo es a donde lleva el resultado
    const [filas] = await pool.query(
        `
        SELECT
            e.id_equipo,
            e.tipo,
            e.marca,
            e.modelo,
            e.numero_serie,
            CONCAT(c.nombre, ' ', c.apellido) AS cliente,
            (SELECT MAX(t.id_ticket) FROM ticket t WHERE t.id_equipo = e.id_equipo) AS ultimo_ticket
        FROM equipo e
        INNER JOIN usuario c
            ON e.id_usuario = c.id_usuario
        WHERE ${condiciones.join(" AND ")}
        ORDER BY ultimo_ticket DESC, e.id_equipo DESC
        LIMIT ${POR_GRUPO}
        `,
        parametros
    );

    return filas;
};

// clientes y personal salen de la misma tabla; cambia el filtro de rol
const buscarPersonas = async (texto, { clientes }) => {
    const like = patron(texto);

    const [filas] = await pool.query(
        `
        SELECT id_usuario, nombre, apellido, correo, telefono, rol, estado
        FROM usuario
        WHERE rol ${clientes ? "=" : "<>"} ?
            AND (CONCAT(nombre, ' ', apellido) LIKE ? OR correo LIKE ? OR num_documento LIKE ? OR telefono LIKE ?)
        ORDER BY nombre, apellido
        LIMIT ${POR_GRUPO}
        `,
        [ROLES.CLIENTE, like, like, like, like]
    );

    return filas;
};

const buscar = async (q, usuario) => {
    const texto = validarTexto(q);
    const esCliente = usuario.rol === ROLES.CLIENTE;
    const esAdministrador = usuario.rol === ROLES.ADMINISTRADOR;

    const [tickets, equipos, clientes, personal] = await Promise.all([
        buscarTickets(texto, usuario),
        buscarEquipos(texto, usuario),
        esCliente ? [] : buscarPersonas(texto, { clientes: true }),
        esAdministrador ? buscarPersonas(texto, { clientes: false }) : [],
    ]);

    return { tickets, equipos, clientes, personal };
};

module.exports = {
    buscar,
};
