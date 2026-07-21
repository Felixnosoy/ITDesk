const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service")
const cotizacionService = require("../services/cotizacion.service")
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");

const COLUMNAS_DETALLE = `
    dc.id_detalle_cotizacion,
    dc.id_cotizacion,
    dc.id_ticket,
    t.titulo AS ticket_titulo,
    dc.descripcion_servicio,
    dc.mano_obra,
    dc.repuestos,
    dc.descuento
`;

const JOIN_DETALLE = `
    FROM detalle_cotizacion dc
    INNER JOIN ticket t
        ON dc.id_ticket = t.id_ticket
`;

const normalizarMonto = (valor, nombreCampo) => {
    if (valor === undefined || valor === null || valor === "") {
        return 0;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero) || numero < 0) {
        throw crearError(`El campo ${nombreCampo} debe ser un número mayor o igual a 0.`, 400);
    }

    return numero;
}

// Verifica que la cotizacion exista y siga en estado Pendiente (editable).
// Devuelve la cotizacion para poder validar el ticket contra su cliente.
const verificarCotizacionEditable = async (id_cotizacion) => {

    const cotizacion = await cotizacionService.obtenerCotizacionPorId(id_cotizacion);

    if (cotizacion.estado !== ESTADOS_COTIZACION.PENDIENTE) {
        throw crearError("No se pueden modificar los detalles de una cotización que no está pendiente.", 409);
    }

    return cotizacion;
}

const crearDetalleCotizacion = async (datos) => {
    const {
        id_cotizacion,
        id_ticket,
        descripcion_servicio,
        mano_obra,
        repuestos,
        descuento
    } = datos;

    if (!id_cotizacion || !id_ticket || !descripcion_servicio) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const descripcionNormalizada = descripcion_servicio.trim();
    const manoObraNormalizada = normalizarMonto(mano_obra, "mano_obra");
    const repuestosNormalizados = normalizarMonto(repuestos, "repuestos");
    const descuentoNormalizado = normalizarMonto(descuento, "descuento");

    // Verificar que la cotizacion exista y siga pendiente
    const cotizacion = await verificarCotizacionEditable(id_cotizacion);

    // Verificar que el ticket exista y pertenezca al mismo cliente de la cotizacion
    const ticket = await ticketService.obtenerTicketPorId(id_ticket);

    if (Number(ticket.id_usuario) !== Number(cotizacion.id_usuario)) {
        throw crearError("El ticket no pertenece al mismo cliente de la cotización.", 400);
    }

    // Verificar que el ticket no tenga ya una linea de cotizacion (UQ_DetalleCotizacion_Ticket)
    const [lineaExistente] = await pool.query(
        `
        SELECT id_detalle_cotizacion
        FROM detalle_cotizacion
        WHERE id_ticket = ?
        `,
        [id_ticket]
    );

    if (lineaExistente.length > 0) {
        throw crearError("Este ticket ya tiene una línea de cotización asociada.", 409);
    }

    // Insertar linea
    const [resultado] = await pool.query(
        `
        INSERT INTO detalle_cotizacion (
            id_cotizacion,
            id_ticket,
            descripcion_servicio,
            mano_obra,
            repuestos,
            descuento
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            id_cotizacion,
            id_ticket,
            descripcionNormalizada,
            manoObraNormalizada,
            repuestosNormalizados,
            descuentoNormalizado
        ]
    );

    // Recalcular subtotal/itbis/total de la cotizacion
    await cotizacionService.recalcularCotizacion(id_cotizacion);

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        WHERE dc.id_detalle_cotizacion = ?
        `,
        [resultado.insertId]
    );

    return detalles[0];
}

// este get sirve para obtener todas las lineas de detalle registradas

const obtenerDetallesCotizacion = async () => {

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        ORDER BY dc.id_detalle_cotizacion DESC
        `
    );

    return detalles;
}

// este get sirve para obtener una linea de detalle en especifico por su id

const obtenerDetalleCotizacionPorId = async (id) => {

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        WHERE dc.id_detalle_cotizacion = ?
        `,
        [id]
    );

    if (detalles.length === 0) {
        throw crearError("Detalle de cotización no encontrado", 404);
    }

    return detalles[0];
}

// este get sirve para obtener las lineas de una cotizacion en especifico

const obtenerDetallesPorCotizacion = async (id_cotizacion) => {

    await cotizacionService.obtenerCotizacionPorId(id_cotizacion);

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        WHERE dc.id_cotizacion = ?
        ORDER BY dc.id_detalle_cotizacion ASC
        `,
        [id_cotizacion]
    );

    return detalles;
}

// este get sirve para obtener las lineas de cotizacion relacionadas a un ticket

const obtenerDetallesPorTicket = async (id_ticket) => {

    await ticketService.obtenerTicketPorId(id_ticket);

    const [detalles] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DETALLE}
        ${JOIN_DETALLE}
        WHERE dc.id_ticket = ?
        ORDER BY dc.id_detalle_cotizacion DESC
        `,
        [id_ticket]
    );

    return detalles;
}

const actualizarDetalleCotizacion = async (id, nuevosDatos) => {

    const {
        descripcion_servicio,
        mano_obra,
        repuestos,
        descuento
    } = nuevosDatos;

    if (!descripcion_servicio) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const descripcionNormalizada = descripcion_servicio.trim();
    const manoObraNormalizada = normalizarMonto(mano_obra, "mano_obra");
    const repuestosNormalizados = normalizarMonto(repuestos, "repuestos");
    const descuentoNormalizado = normalizarMonto(descuento, "descuento");

    // Verificar que la linea exista
    const detalle = await obtenerDetalleCotizacionPorId(id);

    // Verificar que su cotizacion siga pendiente
    await verificarCotizacionEditable(detalle.id_cotizacion);

    await pool.query(
        `
        UPDATE detalle_cotizacion
        SET
            descripcion_servicio = ?,
            mano_obra = ?,
            repuestos = ?,
            descuento = ?
        WHERE id_detalle_cotizacion = ?
        `,
        [descripcionNormalizada, manoObraNormalizada, repuestosNormalizados, descuentoNormalizado, id]
    );

    // Recalcular subtotal/itbis/total de la cotizacion
    await cotizacionService.recalcularCotizacion(detalle.id_cotizacion);

    return obtenerDetalleCotizacionPorId(id);
}

const eliminarDetalleCotizacion = async (id) => {

    // Verificar que la linea exista
    const detalle = await obtenerDetalleCotizacionPorId(id);

    // Verificar que su cotizacion siga pendiente
    await verificarCotizacionEditable(detalle.id_cotizacion);

    await pool.query(
        `
        DELETE FROM detalle_cotizacion
        WHERE id_detalle_cotizacion = ?
        `,
        [id]
    );

    // Recalcular subtotal/itbis/total de la cotizacion
    await cotizacionService.recalcularCotizacion(detalle.id_cotizacion);
}

module.exports = {
    crearDetalleCotizacion,
    obtenerDetallesCotizacion,
    obtenerDetalleCotizacionPorId,
    obtenerDetallesPorCotizacion,
    obtenerDetallesPorTicket,
    actualizarDetalleCotizacion,
    eliminarDetalleCotizacion
}
