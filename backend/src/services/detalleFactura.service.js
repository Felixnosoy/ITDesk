const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service")
const facturaService = require("../services/factura.service")

// solo lectura: las lineas se generan automáticamente al crear la factura
// (copiadas desde detalle_cotizacion) y no se editan manualmente.

const COLUMNAS_DETALLE = `
    df.id_detalle_factura,
    df.id_factura,
    df.id_ticket,
    t.titulo AS ticket_titulo,
    df.descripcion_servicio,
    df.mano_obra,
    df.repuestos,
    df.descuento
`;

const JOIN_DETALLE = `
    FROM detalle_factura df
    INNER JOIN ticket t
        ON df.id_ticket = t.id_ticket
`;

// este get sirve para obtener todas las lineas de detalle de factura registradas

const obtenerDetallesFactura = async () => {

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        ORDER BY df.id_detalle_factura DESC
        `
    );

    return detalles;
}

// este get sirve para obtener una linea de detalle de factura por su id

const obtenerDetalleFacturaPorId = async (id) => {

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        WHERE df.id_detalle_factura = ?
        `,
        [id]
    );

    if (detalles.length === 0) {
        throw crearError("Detalle de factura no encontrado", 404);
    }

    return detalles[0];
}

// este get sirve para obtener las lineas de una factura en especifico

const obtenerDetallesPorFactura = async (id_factura) => {

    await facturaService.obtenerFacturaPorId(id_factura);

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        WHERE df.id_factura = ?
        ORDER BY df.id_detalle_factura ASC
        `,
        [id_factura]
    );

    return detalles;
}

// este get sirve para obtener las lineas de factura relacionadas a un ticket

const obtenerDetallesPorTicket = async (id_ticket) => {

    await ticketService.obtenerTicketPorId(id_ticket);

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        WHERE df.id_ticket = ?
        ORDER BY df.id_detalle_factura DESC
        `,
        [id_ticket]
    );

    return detalles;
}

module.exports = {
    obtenerDetallesFactura,
    obtenerDetalleFacturaPorId,
    obtenerDetallesPorFactura,
    obtenerDetallesPorTicket
}
