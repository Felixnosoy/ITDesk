const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");
const ticketService = require("./ticket.service");
const diagnosticoService = require("./diagnostico.service");
const { TIPOS_ACTUALIZACION } = require("./seguimiento.service");
const { validarId, validarTextoOpcional } = require("../validators/comun.validator");
const { validarLineas, calcularMontos, conMontosNumericos } = require("../utils/montos");

const COLUMNAS_COTIZACION = `
    c.id_cotizacion,
    c.id_ticket,
    c.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS creada_por,
    c.estado,
    c.subtotal,
    c.itbis,
    c.total,
    c.observaciones,
    c.motivo_rechazo,
    c.fecha_creacion,
    c.fecha_decision
`;

const MONTOS_COTIZACION = ["subtotal", "itbis", "total"];
const MONTOS_LINEA = ["precio_unitario", "importe"];

// Pendiente o Aprobada: mientras haya una de estas el ticket no admite
// otra cotizacion. Una Rechazada no cuenta, para poder recotizar.
const ESTADOS_VIGENTES = [ESTADOS_COTIZACION.PENDIENTE, ESTADOS_COTIZACION.APROBADA];

// Con el ticket ya resuelto o cerrado no tiene sentido cotizar.
const ESTADOS_SIN_COTIZAR = [ESTADOS_TICKET.RESUELTO, ESTADOS_TICKET.CERRADO];

// Cotizaciones con sus lineas, de la mas nueva a la mas vieja. Sirve para
// un ticket (condicion por id_ticket) o para una sola cotizacion.
const buscarCotizaciones = async (condicion, parametro) => {
    const [cotizaciones] = await pool.query(
        `
        SELECT
            ${COLUMNAS_COTIZACION}
        FROM cotizacion c
        INNER JOIN usuario u
            ON c.id_usuario = u.id_usuario
        WHERE ${condicion}
        ORDER BY c.fecha_creacion DESC, c.id_cotizacion DESC
        `,
        [parametro]
    );

    if (cotizaciones.length === 0) return [];

    const [lineas] = await pool.query(
        `
        SELECT id_linea, id_cotizacion, descripcion, cantidad, precio_unitario, importe
        FROM cotizacion_linea
        WHERE id_cotizacion IN (?)
        ORDER BY id_linea ASC
        `,
        [cotizaciones.map((c) => c.id_cotizacion)]
    );

    return cotizaciones.map((cotizacion) => ({
        ...conMontosNumericos(cotizacion, MONTOS_COTIZACION),
        lineas: lineas
            .filter((linea) => linea.id_cotizacion === cotizacion.id_cotizacion)
            .map((linea) => conMontosNumericos(linea, MONTOS_LINEA))
    }));
};

const obtenerCotizacionesDeTicket = (id_ticket) =>
    buscarCotizaciones("c.id_ticket = ?", id_ticket);

const obtenerCotizacionPorId = async (id_cotizacion) => {
    const [cotizacion] = await buscarCotizaciones("c.id_cotizacion = ?", id_cotizacion);
    return cotizacion ?? null;
};

// La que esta en juego ahora (Pendiente o Aprobada), o null
const obtenerCotizacionVigente = async (id_ticket, conexion = pool) => {
    const [filas] = await conexion.query(
        `
        SELECT id_cotizacion, estado
        FROM cotizacion
        WHERE id_ticket = ?
        AND estado IN (?)
        LIMIT 1
        `,
        [id_ticket, ESTADOS_VIGENTES]
    );

    return filas[0] ?? null;
};

// GET de las cotizaciones de un ticket; el Cliente solo las de los suyos
// (un ticket ajeno responde 404 en obtenerTicketPorId).
const listarCotizaciones = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    return obtenerCotizacionesDeTicket(ticket.id_ticket);
};

// Mueve el ticket de estado como efecto de la cotizacion y lo deja en la
// linea de tiempo que ve el cliente, dentro de la transaccion recibida.
const moverTicket = async (conexion, { id_ticket, id_usuario, estado, observaciones }) => {
    await conexion.query(
        "UPDATE ticket SET estado = ? WHERE id_ticket = ?",
        [estado, id_ticket]
    );

    await conexion.query(
        `
        INSERT INTO actualizacion (id_ticket, id_usuario, tipo, estado, observaciones)
        VALUES (?, ?, ?, ?, ?)
        `,
        [id_ticket, id_usuario, TIPOS_ACTUALIZACION.ESTADO, estado, observaciones]
    );
};

const enTransaccion = async (trabajo) => {
    const conexion = await pool.getConnection();

    try {
        await conexion.beginTransaction();
        const resultado = await trabajo(conexion);
        await conexion.commit();
        return resultado;
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
};

// Crea la cotizacion de un ticket (issue HU14). Reglas:
// - el ticket necesita diagnostico (sin el no hay nada que cotizar);
// - no puede estar Resuelto ni Cerrado;
// - no puede tener otra Pendiente o Aprobada (tras un rechazo si);
// - los importes y el total los calcula el servidor.
// Al crearla el ticket pasa a Esperando aprobacion: ahora le toca decidir
// al cliente. Todo va en una transaccion que bloquea la fila del ticket,
// asi dos tecnicos cotizando a la vez no dejan dos cotizaciones vigentes.
const crearCotizacion = async (idTicket, datos = {}, usuario) => {
    const lineas = validarLineas(datos.lineas);
    const montos = calcularMontos(lineas);
    const observaciones = validarTextoOpcional(datos.observaciones, "observaciones");

    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);

    if (ESTADOS_SIN_COTIZAR.includes(ticket.estado)) {
        throw crearError(`El ticket está ${ticket.estado.toLowerCase()} y ya no se puede cotizar.`, 400);
    }

    const diagnostico = await diagnosticoService.obtenerDiagnosticoDeTicket(ticket.id_ticket);

    if (!diagnostico) {
        throw crearError("El ticket necesita un diagnóstico antes de cotizarlo.", 400);
    }

    const id_cotizacion = await enTransaccion(async (conexion) => {
        await conexion.query("SELECT id_ticket FROM ticket WHERE id_ticket = ? FOR UPDATE", [ticket.id_ticket]);

        const vigente = await obtenerCotizacionVigente(ticket.id_ticket, conexion);

        if (vigente) {
            throw crearError(
                `El ticket ya tiene una cotización ${vigente.estado.toLowerCase()}. Solo se puede cotizar de nuevo si el cliente la rechaza.`,
                409
            );
        }

        const [resultado] = await conexion.query(
            `
            INSERT INTO cotizacion (id_ticket, id_usuario, estado, subtotal, itbis, total, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                ticket.id_ticket,
                usuario.id_usuario,
                ESTADOS_COTIZACION.PENDIENTE,
                montos.subtotal,
                montos.itbis,
                montos.total,
                observaciones
            ]
        );

        await conexion.query(
            `
            INSERT INTO cotizacion_linea (id_cotizacion, descripcion, cantidad, precio_unitario, importe)
            VALUES ?
            `,
            [lineas.map((l) => [resultado.insertId, l.descripcion, l.cantidad, l.precio_unitario, l.importe])]
        );

        await moverTicket(conexion, {
            id_ticket: ticket.id_ticket,
            id_usuario: usuario.id_usuario,
            estado: ESTADOS_TICKET.ESPERANDO_APROBACION,
            observaciones: "Se envió una cotización al cliente."
        });

        return resultado.insertId;
    });

    return obtenerCotizacionPorId(id_cotizacion);
};

// Que pasa con el ticket segun la decision del cliente: aprobada, a
// reparar; rechazada, de vuelta a diagnostico para que el taller pueda
// armar otra cotizacion (issue HU15.2).
const EFECTO_DECISION = {
    [ESTADOS_COTIZACION.APROBADA]: {
        estado: ESTADOS_TICKET.EN_REPARACION,
        nota: () => "El cliente aprobó la cotización."
    },
    [ESTADOS_COTIZACION.RECHAZADA]: {
        estado: ESTADOS_TICKET.EN_DIAGNOSTICO,
        nota: (motivo) => ["El cliente rechazó la cotización.", motivo && `Motivo: ${motivo}`].filter(Boolean).join(" ")
    }
};

// El cliente dueño aprueba o rechaza una cotizacion Pendiente (issue
// HU15.1). Que sea el Cliente lo exige la ruta; que sea el dueño lo
// resuelve obtenerTicketPorId (un ticket ajeno responde 404). La fila se
// bloquea para que dos clics seguidos no decidan dos veces.
const decidirCotizacion = async (idTicket, idCotizacion, datos = {}, usuario) => {
    const decision = datos.estado;

    if (!Object.keys(EFECTO_DECISION).includes(decision)) {
        throw crearError(`El campo estado debe ser ${Object.keys(EFECTO_DECISION).join(" o ")}.`, 400);
    }

    const motivo = decision === ESTADOS_COTIZACION.RECHAZADA
        ? validarTextoOpcional(datos.motivo, "motivo")
        : null;
    const id_cotizacion = validarId(idCotizacion, "id_cotizacion");
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    const efecto = EFECTO_DECISION[decision];

    const anterior = await enTransaccion(async (conexion) => {
        const [filas] = await conexion.query(
            "SELECT estado FROM cotizacion WHERE id_cotizacion = ? AND id_ticket = ? FOR UPDATE",
            [id_cotizacion, ticket.id_ticket]
        );

        if (filas.length === 0) {
            throw crearError("Cotización no encontrada.", 404);
        }

        if (filas[0].estado !== ESTADOS_COTIZACION.PENDIENTE) {
            throw crearError(`Esta cotización ya fue ${filas[0].estado.toLowerCase()}.`, 409);
        }

        await conexion.query(
            `
            UPDATE cotizacion
            SET estado = ?, motivo_rechazo = ?, fecha_decision = NOW()
            WHERE id_cotizacion = ?
            `,
            [decision, motivo, id_cotizacion]
        );

        // si el ticket no esta esperando la decision (no deberia pasar,
        // estado.service no lo deja salir de ahi con una pendiente) se
        // registra la decision pero no se toca su estado
        if (ticket.estado === ESTADOS_TICKET.ESPERANDO_APROBACION) {
            await moverTicket(conexion, {
                id_ticket: ticket.id_ticket,
                id_usuario: usuario.id_usuario,
                estado: efecto.estado,
                observaciones: efecto.nota(motivo)
            });
        }

        return filas[0].estado;
    });

    return {
        anterior,
        cotizacion: await obtenerCotizacionPorId(id_cotizacion)
    };
};

module.exports = {
    decidirCotizacion,
    obtenerCotizacionesDeTicket,
    obtenerCotizacionPorId,
    obtenerCotizacionVigente,
    listarCotizaciones,
    crearCotizacion,
    moverTicket,
    enTransaccion
};
