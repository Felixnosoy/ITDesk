const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const CATEGORIAS_TICKET = require("../constants/categoriasTicket");
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");
const ESTADOS_FACTURA = require("../constants/estadosFactura");
const { verificarClienteExiste, verificarUsuarioExiste } = require("../validators/usuario.validator");

const COLUMNAS_TICKET = `
    t.id_ticket,
    t.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS cliente,
    t.id_equipo,
    e.tipo AS equipo_tipo,
    e.marca AS equipo_marca,
    e.modelo AS equipo_modelo,
    e.numero_serie AS equipo_numero_serie,
    t.titulo,
    t.descripcion,
    t.prioridad,
    t.categoria,
    t.estado,
    t.fecha_apertura,
    t.fecha_resolucion,
    t.fecha_cierre
`

const JOIN_TICKET = `
    FROM ticket t
    INNER JOIN usuario u
        ON t.id_usuario = u.id_usuario
    INNER JOIN equipo e
        ON t.id_equipo = e.id_equipo
`

const CATEGORIAS_PERMITIDAS = Object.values(CATEGORIAS_TICKET);

const crearTicket = async (datos) => {
    const {
        id_usuario,
        id_equipo,
        titulo,
        descripcion,
        prioridad,
        categoria
    } = datos;

    if (
        !id_usuario ||
        !id_equipo ||
        !titulo ||
        !descripcion ||
        !prioridad ||
        !categoria
    ) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const tituloNormalizado = titulo.trim();
    const descripcionNormalizada = descripcion.trim();
    const prioridadNormalizada = prioridad.trim();
    const categoriaNormalizada = categoria.trim();

    if (!CATEGORIAS_PERMITIDAS.includes(categoriaNormalizada)) {
        throw crearError(
            `Categoría inválida. Debe ser: ${CATEGORIAS_PERMITIDAS.join(", ")}.`,
            400
        );
    }

    // Verificar que el cliente exista
    await verificarClienteExiste(id_usuario);

    // Verificar que el equipo exista y pertenezca a ese cliente
    const [equipos] = await pool.query(
        `
        SELECT id_equipo
        FROM equipo
        WHERE id_equipo = ?
        AND id_usuario = ?
        `,
        [id_equipo, id_usuario]
    );

    if (equipos.length === 0) {
        throw crearError("El equipo no existe o no pertenece a este cliente.", 404);
    }

    // Insertar ticket (fecha_apertura la asigna la base de datos)
    const [resultado] = await pool.query(
        `
        INSERT INTO ticket (
            id_usuario,
            id_equipo,
            titulo,
            descripcion,
            prioridad,
            categoria,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id_usuario,
            id_equipo,
            tituloNormalizado,
            descripcionNormalizada,
            prioridadNormalizada,
            categoriaNormalizada,
            ESTADOS_TICKET.ABIERTO
        ]
    );

    // Obtener el ticket recién creado
    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [resultado.insertId]
    );

    return tickets[0];
}

// este get sirve para obtener todos los tickets registrados

const obtenerTickets = async () => {

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        ORDER BY t.id_ticket DESC
        `
    );

    return tickets;
}

// este get sirve para obtener un ticket en especifico por su id

const obtenerTicketPorId = async (id) => {

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [id]
    );

    if (tickets.length === 0) {
        throw crearError("Ticket no encontrado", 404);
    }

    return tickets[0];
}

// este get sirve para obtener todos los tickets de un usuario en especifico

const obtenerTicketsDeUsuarioPorId = async (id_usuario) => {

    await verificarUsuarioExiste(id_usuario, "El cliente no existe.");

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_usuario = ?
        ORDER BY t.id_ticket DESC
        `,
        [id_usuario]
    );

    return tickets;
}

// cierra el ticket: el sistema asigna fecha_cierre, el usuario no la maneja
const cerrarTicket = async (id) => {

    const [ticketExistente] = await pool.query(
        `
        SELECT id_ticket, estado
        FROM ticket
        WHERE id_ticket = ?
        `,
        [id]
    );

    if (ticketExistente.length === 0) {
        throw crearError("Ticket no encontrado", 404);
    }

    if (ticketExistente[0].estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket ya se encuentra cerrado.", 409);
    }

    await pool.query(
        `
        UPDATE ticket
        SET
            estado = ?,
            fecha_cierre = CURRENT_TIMESTAMP()
        WHERE id_ticket = ?
        `,
        [ESTADOS_TICKET.CERRADO, id]
    );

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [id]
    );

    return tickets[0];
}

// true si el ticket tiene una cotizacion Aprobada con una factura vigente
// (no Anulada) — la señal de que el ciclo cotizar-aprobar-facturar se
// completo para este ticket. Toma la linea de cotizacion mas reciente, ya
// que un ticket puede tener varios intentos (rechazados/vencidos) en su
// historial.
const verificarTicketFacturado = async (id_ticket) => {

    const [[ultimaLinea]] = await pool.query(
        `
        SELECT dc.id_cotizacion, c.estado AS estado_cotizacion
        FROM detalle_cotizacion dc
        INNER JOIN cotizacion c ON dc.id_cotizacion = c.id_cotizacion
        WHERE dc.id_ticket = ?
        ORDER BY dc.id_detalle_cotizacion DESC
        LIMIT 1
        `,
        [id_ticket]
    );

    if (!ultimaLinea || ultimaLinea.estado_cotizacion !== ESTADOS_COTIZACION.APROBADA) {
        return false;
    }

    const [[factura]] = await pool.query(
        `
        SELECT estado
        FROM factura
        WHERE id_cotizacion = ?
        ORDER BY id_factura DESC
        LIMIT 1
        `,
        [ultimaLinea.id_cotizacion]
    );

    return Boolean(factura) && factura.estado !== ESTADOS_FACTURA.ANULADA;
}

// cambia el estado del ticket a "En proceso" o "Resuelto".
// abrir y cerrar el ticket tienen sus propios endpoints y no pasan por aquí.
const ESTADOS_PERMITIDOS = [ESTADOS_TICKET.EN_PROCESO, ESTADOS_TICKET.RESUELTO];

const cambiarEstadoTicket = async (id, estado, opciones = {}) => {

    if (typeof estado !== "string" || !ESTADOS_PERMITIDOS.includes(estado.trim())) {
        throw crearError(
            `Estado inválido. Debe ser: ${ESTADOS_PERMITIDOS.join(" o ")}.`,
            400
        );
    }

    const estadoNormalizado = estado.trim();

    const [ticketExistente] = await pool.query(
        `
        SELECT id_ticket, estado
        FROM ticket
        WHERE id_ticket = ?
        `,
        [id]
    );

    if (ticketExistente.length === 0) {
        throw crearError("Ticket no encontrado", 404);
    }

    if (ticketExistente[0].estado === ESTADOS_TICKET.CERRADO) {
        throw crearError("El ticket ya está cerrado y no puede cambiar de estado.", 409);
    }

    if (estadoNormalizado === ESTADOS_TICKET.RESUELTO && !(await verificarTicketFacturado(id))) {
        const { sinCosto, motivoSinCosto } = opciones;

        if (!sinCosto) {
            throw crearError(
                "No se puede marcar el ticket como Resuelto sin una cotización aprobada y facturada. Si no requiere cargo, indícalo explícitamente.",
                409
            );
        }

        if (typeof motivoSinCosto !== "string" || !motivoSinCosto.trim()) {
            throw crearError("Debes indicar un motivo para cerrar el ticket sin costo.", 400);
        }
    }

    // fecha_resolucion marca cuando el ticket llego a "Resuelto" (para medir
    // tiempo de reparacion real en el Reporte de Rendimiento de Tecnicos) —
    // distinta de fecha_cierre, que es un paso administrativo aparte y puede
    // pasar mucho despues. Si el ticket vuelve a "En proceso" se limpia, para
    // que la columna siempre refleje si el ticket esta Resuelto ahora mismo
    // (un Cerrado la conserva, porque cerrarTicket no la toca).
    await pool.query(
        `
        UPDATE ticket
        SET
            estado = ?,
            fecha_resolucion = ${estadoNormalizado === ESTADOS_TICKET.RESUELTO ? "CURRENT_TIMESTAMP()" : "NULL"}
        WHERE id_ticket = ?
        `,
        [estadoNormalizado, id]
    );

    const [tickets] = await pool.query(
        `
        SELECT
            ${COLUMNAS_TICKET}
        ${JOIN_TICKET}
        WHERE t.id_ticket = ?
        `,
        [id]
    );

    return tickets[0];
}

module.exports = {
    crearTicket,
    obtenerTickets,
    obtenerTicketPorId,
    obtenerTicketsDeUsuarioPorId,
    cerrarTicket,
    cambiarEstadoTicket
}