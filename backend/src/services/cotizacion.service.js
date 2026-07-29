const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");
const TASA_ITBIS = require("../constants/itbis");
const { verificarClienteExiste, verificarUsuarioExiste } = require("../validators/usuario.validator");

const COLUMNAS_COTIZACION = `
    c.id_cotizacion,
    c.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS cliente,
    c.fecha_creacion,
    c.subtotal,
    c.itbis,
    c.descuento_total,
    c.total,
    c.estado
`;

const JOIN_COTIZACION = `
    FROM cotizacion c
    INNER JOIN usuario u
        ON c.id_usuario = u.id_usuario
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

const crearCotizacion = async (datos) => {
    const { id_usuario, descuento_total } = datos;

    if (!id_usuario) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const descuentoNormalizado = normalizarMonto(descuento_total, "descuento_total");

    // Verificar que el cliente exista
    await verificarClienteExiste(id_usuario);

    // Insertar cotizacion (fecha_creacion, subtotal, itbis y total los asigna/calcula el sistema)
    const [resultado] = await pool.query(
        `
        INSERT INTO cotizacion (
            id_usuario,
            descuento_total,
            estado
        )
        VALUES (?, ?, ?)
        `,
        [id_usuario, descuentoNormalizado, ESTADOS_COTIZACION.PENDIENTE]
    );

    const [cotizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_COTIZACION}
        ${JOIN_COTIZACION}
        WHERE c.id_cotizacion = ?
        `,
        [resultado.insertId]
    );

    return cotizaciones[0];
}

// este get sirve para obtener todas las cotizaciones registradas

const obtenerCotizaciones = async () => {

    const [cotizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_COTIZACION}
        ${JOIN_COTIZACION}
        ORDER BY c.id_cotizacion DESC
        `
    );

    return cotizaciones;
}

// este get sirve para obtener una cotizacion en especifico por su id

const obtenerCotizacionPorId = async (id) => {

    const [cotizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_COTIZACION}
        ${JOIN_COTIZACION}
        WHERE c.id_cotizacion = ?
        `,
        [id]
    );

    if (cotizaciones.length === 0) {
        throw crearError("Cotización no encontrada", 404);
    }

    return cotizaciones[0];
}

// este get sirve para obtener todas las cotizaciones de un cliente en especifico

const obtenerCotizacionesPorUsuario = async (id_usuario) => {

    await verificarUsuarioExiste(id_usuario, "El cliente no existe.");

    const [cotizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_COTIZACION}
        ${JOIN_COTIZACION}
        WHERE c.id_usuario = ?
        ORDER BY c.id_cotizacion DESC
        `,
        [id_usuario]
    );

    return cotizaciones;
}

// Recalcula subtotal, itbis y total de una cotizacion a partir de sus lineas
// en detalle_cotizacion. La llama detalle_cotizacion.service.js cada vez que
// una linea se crea, edita o elimina.
const recalcularCotizacion = async (id_cotizacion) => {

    const [[{ subtotal }]] = await pool.query(
        `
        SELECT COALESCE(SUM(mano_obra + repuestos - descuento), 0) AS subtotal
        FROM detalle_cotizacion
        WHERE id_cotizacion = ?
        `,
        [id_cotizacion]
    );

    const [[{ descuento_total }]] = await pool.query(
        `
        SELECT descuento_total
        FROM cotizacion
        WHERE id_cotizacion = ?
        `,
        [id_cotizacion]
    );

    const subtotalNumerico = Number(subtotal);
    const descuentoTotalNumerico = Number(descuento_total) || 0;

    const baseConDescuento = Math.max(subtotalNumerico - descuentoTotalNumerico, 0);
    const itbis = Number((baseConDescuento * TASA_ITBIS).toFixed(2));
    const total = Number((baseConDescuento + itbis).toFixed(2));

    await pool.query(
        `
        UPDATE cotizacion
        SET
            subtotal = ?,
            itbis = ?,
            total = ?
        WHERE id_cotizacion = ?
        `,
        [subtotalNumerico, itbis, total, id_cotizacion]
    );
}

// actualiza el descuento global de la cotizacion (no el de cada linea) y recalcula totales
const actualizarDescuentoTotal = async (id, descuento_total) => {

    const descuentoNormalizado = normalizarMonto(descuento_total, "descuento_total");

    const cotizacion = await obtenerCotizacionPorId(id);

    if (cotizacion.estado !== ESTADOS_COTIZACION.PENDIENTE) {
        throw crearError("No se puede modificar una cotización que no está pendiente.", 409);
    }

    await pool.query(
        `
        UPDATE cotizacion
        SET descuento_total = ?
        WHERE id_cotizacion = ?
        `,
        [descuentoNormalizado, id]
    );

    await recalcularCotizacion(id);

    return obtenerCotizacionPorId(id);
}

const ESTADOS_VALIDOS = Object.values(ESTADOS_COTIZACION);

// cambia el estado de la cotizacion (Aprobada, Rechazada o Vencida).
// una vez que sale de Pendiente queda bloqueada (igual que un ticket cerrado).
const cambiarEstadoCotizacion = async (id, estado) => {

    if (typeof estado !== "string" || !ESTADOS_VALIDOS.includes(estado.trim())) {
        throw crearError(
            `Estado inválido. Debe ser: ${ESTADOS_VALIDOS.join(", ")}.`,
            400
        );
    }

    const estadoNormalizado = estado.trim();

    const cotizacion = await obtenerCotizacionPorId(id);

    if (cotizacion.estado !== ESTADOS_COTIZACION.PENDIENTE) {
        throw crearError("Esta cotización ya no puede cambiar de estado.", 409);
    }

    await pool.query(
        `
        UPDATE cotizacion
        SET estado = ?
        WHERE id_cotizacion = ?
        `,
        [estadoNormalizado, id]
    );

    return obtenerCotizacionPorId(id);
}

// aprobar/rechazar es una decision del cliente dueño de la cotizacion — a
// diferencia de cambiarEstadoCotizacion (Administrador, cualquier estado
// valido), esta version solo acepta Aprobada/Rechazada y verifica dueño.
const ESTADOS_CLIENTE = [ESTADOS_COTIZACION.APROBADA, ESTADOS_COTIZACION.RECHAZADA];

const cambiarEstadoCotizacionCliente = async (id, estado, id_usuario_solicitante) => {

    if (typeof estado !== "string" || !ESTADOS_CLIENTE.includes(estado.trim())) {
        throw crearError(
            `Estado inválido. Debe ser: ${ESTADOS_CLIENTE.join(" o ")}.`,
            400
        );
    }

    const cotizacion = await obtenerCotizacionPorId(id);

    if (Number(cotizacion.id_usuario) !== Number(id_usuario_solicitante)) {
        throw crearError("No tienes permisos para modificar esta cotización.", 403);
    }

    return cambiarEstadoCotizacion(id, estado.trim());
}

const eliminarCotizacion = async (id) => {

    // Verificar que la cotizacion exista
    await obtenerCotizacionPorId(id);

    // Eliminar primero sus lineas de detalle (evita el error de FK)
    await pool.query(
        `
        DELETE FROM detalle_cotizacion
        WHERE id_cotizacion = ?
        `,
        [id]
    );

    await pool.query(
        `
        DELETE FROM cotizacion
        WHERE id_cotizacion = ?
        `,
        [id]
    );
}

module.exports = {
    crearCotizacion,
    obtenerCotizaciones,
    obtenerCotizacionPorId,
    obtenerCotizacionesPorUsuario,
    recalcularCotizacion,
    actualizarDescuentoTotal,
    cambiarEstadoCotizacion,
    cambiarEstadoCotizacionCliente,
    eliminarCotizacion
}
