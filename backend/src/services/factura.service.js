const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");
const ticketService = require("./ticket.service");
const { enTransaccion } = require("./cotizacion.service");
const { TIPOS_ACTUALIZACION } = require("./seguimiento.service");
const { conMontosNumericos } = require("../utils/montos");

const COLUMNAS_FACTURA = `
    f.id_factura,
    f.id_cotizacion,
    f.id_ticket,
    f.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS emitida_por,
    f.subtotal,
    f.itbis,
    f.total,
    f.fecha_emision
`;

const MONTOS_FACTURA = ["subtotal", "itbis", "total"];
const MONTOS_LINEA = ["precio_unitario", "importe"];

// Factura del ticket con sus lineas, o null si todavia no tiene. Un
// ticket tiene a lo sumo una: solo se factura la cotizacion aprobada y
// mientras haya una aprobada no se puede armar otra.
const obtenerFacturaDeTicket = async (id_ticket) => {
    const [facturas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_FACTURA}
        FROM factura f
        INNER JOIN usuario u
            ON f.id_usuario = u.id_usuario
        WHERE f.id_ticket = ?
        `,
        [id_ticket]
    );

    if (facturas.length === 0) return null;

    const factura = facturas[0];
    const [lineas] = await pool.query(
        `
        SELECT id_linea, descripcion, cantidad, precio_unitario, importe
        FROM factura_linea
        WHERE id_factura = ?
        ORDER BY id_linea ASC
        `,
        [factura.id_factura]
    );

    return {
        ...conMontosNumericos(factura, MONTOS_FACTURA),
        lineas: lineas.map((linea) => conMontosNumericos(linea, MONTOS_LINEA))
    };
};

// Regla de cierre (issue HU13.2): un ticket facturado ya tiene su
// cotizacion aprobada, porque solo esas se facturan.
const tieneFactura = async (id_ticket) => {
    const [filas] = await pool.query(
        "SELECT id_factura FROM factura WHERE id_ticket = ? LIMIT 1",
        [id_ticket]
    );

    return filas.length > 0;
};

// GET de la factura de un ticket; el Cliente solo la de los suyos
const consultarFactura = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    const factura = await obtenerFacturaDeTicket(ticket.id_ticket);

    if (!factura) {
        throw crearError("El ticket todavía no tiene factura.", 404);
    }

    return factura;
};

// Genera la factura del ticket desde su cotizacion Aprobada (issue HU16):
// copia los montos y las lineas tal como el cliente las aprobo, nada se
// recalcula ni se recibe del frontend. Deja un aviso en la linea de
// tiempo para que el cliente sepa que ya puede pagarla. La fila del
// ticket se bloquea para que dos clics no generen dos facturas.
const generarFactura = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);

    if (ticket.estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket está cerrado y ya no se puede facturar.", 400);
    }

    await enTransaccion(async (conexion) => {
        await conexion.query("SELECT id_ticket FROM ticket WHERE id_ticket = ? FOR UPDATE", [ticket.id_ticket]);

        const [aprobadas] = await conexion.query(
            `
            SELECT id_cotizacion, subtotal, itbis, total
            FROM cotizacion
            WHERE id_ticket = ?
            AND estado = ?
            `,
            [ticket.id_ticket, ESTADOS_COTIZACION.APROBADA]
        );

        if (aprobadas.length === 0) {
            throw crearError("El ticket no tiene una cotización aprobada por el cliente. Solo se factura una cotización aprobada.", 400);
        }

        const cotizacion = aprobadas[0];
        const [existentes] = await conexion.query(
            "SELECT id_factura FROM factura WHERE id_cotizacion = ?",
            [cotizacion.id_cotizacion]
        );

        if (existentes.length > 0) {
            throw crearError("Esta cotización ya tiene su factura.", 409);
        }

        const [resultado] = await conexion.query(
            `
            INSERT INTO factura (id_cotizacion, id_ticket, id_usuario, subtotal, itbis, total)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                cotizacion.id_cotizacion,
                ticket.id_ticket,
                usuario.id_usuario,
                cotizacion.subtotal,
                cotizacion.itbis,
                cotizacion.total
            ]
        );

        await conexion.query(
            `
            INSERT INTO factura_linea (id_factura, descripcion, cantidad, precio_unitario, importe)
            SELECT ?, descripcion, cantidad, precio_unitario, importe
            FROM cotizacion_linea
            WHERE id_cotizacion = ?
            ORDER BY id_linea
            `,
            [resultado.insertId, cotizacion.id_cotizacion]
        );

        await conexion.query(
            `
            INSERT INTO actualizacion (id_ticket, id_usuario, tipo, estado, observaciones)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                ticket.id_ticket,
                usuario.id_usuario,
                TIPOS_ACTUALIZACION.AVANCE,
                ticket.estado,
                "Se emitió la factura del trabajo."
            ]
        );
    });

    return obtenerFacturaDeTicket(ticket.id_ticket);
};

module.exports = {
    obtenerFacturaDeTicket,
    tieneFactura,
    consultarFactura,
    generarFactura
};
