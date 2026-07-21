const pool = require("../config/database")
const crearError = require("../utils/crearError");
const cotizacionService = require("../services/cotizacion.service")
const detalleCotizacionService = require("../services/detalleCotizacion.service")
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");
const ESTADOS_FACTURA = require("../constants/estadosFactura");
const { verificarUsuarioExiste } = require("../validators/usuario.validator");

const COLUMNAS_FACTURA = `
    f.id_factura,
    f.id_cotizacion,
    f.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS cliente,
    f.fecha_emision,
    f.subtotal,
    f.itbis,
    f.total,
    f.estado,
    f.observaciones
`;

const JOIN_FACTURA = `
    FROM factura f
    INNER JOIN usuario u
        ON f.id_usuario = u.id_usuario
`;

// genera la factura a partir de una cotizacion Aprobada: copia (snapshot) sus
// montos ya aprobados y sus lineas de detalle, tal como el cliente las aceptó.
const crearFactura = async (datos) => {
    const { id_cotizacion, observaciones } = datos;

    if (!id_cotizacion) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const observacionesNormalizadas = observaciones?.trim() || null;

    const cotizacion = await cotizacionService.obtenerCotizacionPorId(id_cotizacion);

    if (cotizacion.estado !== ESTADOS_COTIZACION.APROBADA) {
        throw crearError("Solo se puede facturar una cotización aprobada.", 409);
    }

    // Verificar que esta cotizacion no tenga ya una factura generada
    const [facturaExistente] = await pool.query(
        `
        SELECT id_factura
        FROM factura
        WHERE id_cotizacion = ?
        `,
        [id_cotizacion]
    );

    if (facturaExistente.length > 0) {
        throw crearError("Esta cotización ya tiene una factura generada.", 409);
    }

    const lineas = await detalleCotizacionService.obtenerDetallesPorCotizacion(id_cotizacion);

    if (lineas.length === 0) {
        throw crearError("La cotización no tiene líneas de detalle para facturar.", 409);
    }

    // Insertar factura copiando los montos ya aprobados en la cotizacion
    const [resultado] = await pool.query(
        `
        INSERT INTO factura (
            id_cotizacion,
            id_usuario,
            subtotal,
            itbis,
            total,
            estado,
            observaciones
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id_cotizacion,
            cotizacion.id_usuario,
            cotizacion.subtotal,
            cotizacion.itbis,
            cotizacion.total,
            ESTADOS_FACTURA.PENDIENTE,
            observacionesNormalizadas
        ]
    );

    const id_factura = resultado.insertId;

    // Copiar cada linea de la cotizacion a detalle_factura
    for (const linea of lineas) {
        await pool.query(
            `
            INSERT INTO detalle_factura (
                id_factura,
                id_ticket,
                descripcion_servicio,
                mano_obra,
                repuestos,
                descuento
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                id_factura,
                linea.id_ticket,
                linea.descripcion_servicio,
                linea.mano_obra,
                linea.repuestos,
                linea.descuento
            ]
        );
    }

    const [facturas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_FACTURA}
        ${JOIN_FACTURA}
        WHERE f.id_factura = ?
        `,
        [id_factura]
    );

    return facturas[0];
}

// este get sirve para obtener todas las facturas registradas

const obtenerFacturas = async () => {

    const [facturas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_FACTURA}
        ${JOIN_FACTURA}
        ORDER BY f.id_factura DESC
        `
    );

    return facturas;
}

// este get sirve para obtener una factura en especifico por su id

const obtenerFacturaPorId = async (id) => {

    const [facturas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_FACTURA}
        ${JOIN_FACTURA}
        WHERE f.id_factura = ?
        `,
        [id]
    );

    if (facturas.length === 0) {
        throw crearError("Factura no encontrada", 404);
    }

    return facturas[0];
}

// este get sirve para obtener todas las facturas de un cliente en especifico

const obtenerFacturasPorUsuario = async (id_usuario) => {

    await verificarUsuarioExiste(id_usuario, "El cliente no existe.");

    const [facturas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_FACTURA}
        ${JOIN_FACTURA}
        WHERE f.id_usuario = ?
        ORDER BY f.id_factura DESC
        `,
        [id_usuario]
    );

    return facturas;
}

const ESTADOS_PERMITIDOS = [
    ESTADOS_FACTURA.PAGADA,
    ESTADOS_FACTURA.ANULADA,
    ESTADOS_FACTURA.VENCIDA
];

const ESTADOS_FINALES = [ESTADOS_FACTURA.PAGADA, ESTADOS_FACTURA.ANULADA];

// cambia el estado de pago de la factura (Pagada, Anulada o Vencida).
// una factura Pagada o Anulada queda bloqueada; Vencida todavia puede pagarse o anularse.
const cambiarEstadoFactura = async (id, estado) => {

    if (typeof estado !== "string" || !ESTADOS_PERMITIDOS.includes(estado.trim())) {
        throw crearError(
            `Estado inválido. Debe ser: ${ESTADOS_PERMITIDOS.join(", ")}.`,
            400
        );
    }

    const estadoNormalizado = estado.trim();

    const factura = await obtenerFacturaPorId(id);

    if (ESTADOS_FINALES.includes(factura.estado)) {
        throw crearError("Esta factura ya no puede cambiar de estado.", 409);
    }

    await pool.query(
        `
        UPDATE factura
        SET estado = ?
        WHERE id_factura = ?
        `,
        [estadoNormalizado, id]
    );

    return obtenerFacturaPorId(id);
}

const actualizarObservaciones = async (id, observaciones) => {

    await obtenerFacturaPorId(id);

    const observacionesNormalizadas = observaciones?.trim() || null;

    await pool.query(
        `
        UPDATE factura
        SET observaciones = ?
        WHERE id_factura = ?
        `,
        [observacionesNormalizadas, id]
    );

    return obtenerFacturaPorId(id);
}

const eliminarFactura = async (id) => {

    // Verificar que la factura exista
    await obtenerFacturaPorId(id);

    // Eliminar primero sus lineas de detalle (evita el error de FK)
    await pool.query(
        `
        DELETE FROM detalle_factura
        WHERE id_factura = ?
        `,
        [id]
    );

    await pool.query(
        `
        DELETE FROM factura
        WHERE id_factura = ?
        `,
        [id]
    );
}

module.exports = {
    crearFactura,
    obtenerFacturas,
    obtenerFacturaPorId,
    obtenerFacturasPorUsuario,
    cambiarEstadoFactura,
    actualizarObservaciones,
    eliminarFactura
}
