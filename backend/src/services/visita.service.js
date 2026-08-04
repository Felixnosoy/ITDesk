const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ESTADOS_VISITA = require("../constants/estadosVisita");
const ROLES = require("../constants/roles");
const { verificarTecnicoExiste } = require("../validators/usuario.validator");
const especialidadService = require("./especialidad.service");
const ticketService = require("./ticket.service");

// Diagnostico/cotizacion/factura de una visita se resuelven con los modulos
// de ticket ya existentes (una vez confirmada, la visita queda vinculada a
// un ticket) — esta tabla solo trackea la programacion en si.

const COLUMNAS_VISITA = `
    v.id_visita,
    v.id_usuario,
    CONCAT(uc.nombre, ' ', uc.apellido) AS cliente,
    v.id_especialidad,
    esp.nombre AS especialidad,
    v.id_tecnico,
    CONCAT(ut.nombre, ' ', ut.apellido) AS tecnico,
    v.id_ticket,
    v.fecha_solicitada,
    v.hora_solicitada,
    v.direccion,
    v.motivo,
    v.estado,
    v.fecha_creacion,
    v.fecha_confirmacion,
    v.observaciones
`;

const JOIN_VISITA = `
    FROM visita_tecnica v
    INNER JOIN usuario uc
        ON v.id_usuario = uc.id_usuario
    INNER JOIN especialidad esp
        ON v.id_especialidad = esp.id_especialidad
    LEFT JOIN usuario ut
        ON v.id_tecnico = ut.id_usuario
`;

const ESTADOS_TERMINALES = [ESTADOS_VISITA.FINALIZADA, ESTADOS_VISITA.CANCELADA];

const validarFechaFutura = (fecha_solicitada, hora_solicitada) => {
    const fechaHora = new Date(`${fecha_solicitada}T${hora_solicitada}`);

    if (Number.isNaN(fechaHora.getTime()) || fechaHora <= new Date()) {
        throw crearError("La fecha y hora de la visita deben ser futuras.", 400);
    }
}

const crearVisita = async (datos) => {
    const {
        id_usuario,
        id_especialidad,
        fecha_solicitada,
        hora_solicitada,
        direccion,
        motivo
    } = datos;

    if (
        !id_usuario ||
        !id_especialidad ||
        !fecha_solicitada ||
        !hora_solicitada ||
        !direccion ||
        !motivo
    ) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    validarFechaFutura(fecha_solicitada, hora_solicitada);

    // valida que la especialidad exista
    await especialidadService.obtenerEspecialidadPorId(id_especialidad);

    const [resultado] = await pool.query(
        `
        INSERT INTO visita_tecnica (
            id_usuario,
            id_especialidad,
            fecha_solicitada,
            hora_solicitada,
            direccion,
            motivo,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id_usuario,
            id_especialidad,
            fecha_solicitada,
            hora_solicitada,
            direccion.trim(),
            motivo.trim(),
            ESTADOS_VISITA.PENDIENTE
        ]
    );

    return obtenerVisitaPorId(resultado.insertId);
}

// todas las visitas del sistema — alimenta el calendario de Recepcion, mas
// proximas primero
const obtenerVisitas = async () => {
    const [visitas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_VISITA}
        ${JOIN_VISITA}
        ORDER BY v.fecha_solicitada ASC, v.hora_solicitada ASC
        `
    );

    return visitas;
}

// las visitas propias de un cliente (mas recientes primero)
const obtenerVisitasDeUsuario = async (id_usuario) => {
    const [visitas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_VISITA}
        ${JOIN_VISITA}
        WHERE v.id_usuario = ?
        ORDER BY v.fecha_solicitada DESC, v.hora_solicitada DESC
        `,
        [id_usuario]
    );

    return visitas;
}

// las visitas asignadas a un tecnico — proximas primero, es su cola de trabajo
const obtenerVisitasDeTecnico = async (id_tecnico) => {
    const [visitas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_VISITA}
        ${JOIN_VISITA}
        WHERE v.id_tecnico = ?
        ORDER BY v.fecha_solicitada ASC, v.hora_solicitada ASC
        `,
        [id_tecnico]
    );

    return visitas;
}

const obtenerVisitaPorId = async (id) => {
    const [visitas] = await pool.query(
        `
        SELECT
            ${COLUMNAS_VISITA}
        ${JOIN_VISITA}
        WHERE v.id_visita = ?
        `,
        [id]
    );

    if (visitas.length === 0) {
        throw crearError("Visita no encontrada", 404);
    }

    return visitas[0];
}

// version liviana (sin los JOIN) para los chequeos de estado internos
const obtenerVisitaCruda = async (id) => {
    const [visitas] = await pool.query(
        "SELECT * FROM visita_tecnica WHERE id_visita = ?",
        [id]
    );

    if (visitas.length === 0) {
        throw crearError("Visita no encontrada", 404);
    }

    return visitas[0];
}

// tecnicos con la especialidad pedida + sus horarios ya ocupados ese dia
// (chequeo de solapamiento simple, no un motor de turnos completo)
const obtenerDisponibilidad = async (id_especialidad, fecha) => {
    if (!id_especialidad || !fecha) {
        throw crearError("id_especialidad y fecha son requeridos.", 400);
    }

    await especialidadService.obtenerEspecialidadPorId(id_especialidad);

    const [tecnicos] = await pool.query(
        `
        SELECT u.id_usuario, CONCAT(u.nombre, ' ', u.apellido) AS nombre
        FROM tecnico_especialidad te
        INNER JOIN usuario u
            ON te.id_usuario = u.id_usuario
        WHERE te.id_especialidad = ?
        AND u.estado = 'Activo'
        ORDER BY u.nombre ASC
        `,
        [id_especialidad]
    );

    const [ocupados] = await pool.query(
        `
        SELECT id_tecnico, hora_solicitada
        FROM visita_tecnica
        WHERE fecha_solicitada = ?
        AND id_tecnico IS NOT NULL
        AND estado != ?
        `,
        [fecha, ESTADOS_VISITA.CANCELADA]
    );

    return tecnicos.map((tecnico) => ({
        ...tecnico,
        horasOcupadas: ocupados
            .filter((ocupado) => ocupado.id_tecnico === tecnico.id_usuario)
            .map((ocupado) => ocupado.hora_solicitada)
    }));
}

// confirma la visita: exige un tecnico, y si todavia no tiene un ticket
// vinculado, crea uno nuevo (con el equipo indicado) o vincula uno existente
// del mismo cliente — el ticket nace aca, nunca por el propio cliente.
const confirmarVisita = async (id, datos) => {
    const { id_tecnico, id_equipo, id_ticket } = datos;

    const visita = await obtenerVisitaCruda(id);

    if (ESTADOS_TERMINALES.includes(visita.estado)) {
        throw crearError("Esta visita ya no puede confirmarse.", 409);
    }

    const tecnicoFinal = id_tecnico || visita.id_tecnico;

    if (!tecnicoFinal) {
        throw crearError("Debe indicarse un técnico para confirmar la visita.", 400);
    }

    await verificarTecnicoExiste(tecnicoFinal);

    let idTicketFinal = visita.id_ticket;

    if (!idTicketFinal) {
        if (id_ticket) {
            const ticket = await ticketService.obtenerTicketPorId(id_ticket);

            if (Number(ticket.id_usuario) !== Number(visita.id_usuario)) {
                throw crearError("El ticket indicado no pertenece a este cliente.", 400);
            }

            idTicketFinal = id_ticket;
        } else {
            if (!id_equipo) {
                throw crearError("Debe indicarse un equipo (o un ticket existente) para confirmar la visita.", 400);
            }

            const especialidad = await especialidadService.obtenerEspecialidadPorId(visita.id_especialidad);

            const ticketNuevo = await ticketService.crearTicket({
                id_usuario: visita.id_usuario,
                id_equipo,
                titulo: `Visita técnica: ${especialidad.nombre}`,
                descripcion: visita.motivo,
                prioridad: "Media",
                categoria: "Otro"
            });

            idTicketFinal = ticketNuevo.id_ticket;
        }
    }

    await pool.query(
        `
        UPDATE visita_tecnica
        SET
            id_tecnico = ?,
            id_ticket = ?,
            estado = ?,
            fecha_confirmacion = CURRENT_TIMESTAMP()
        WHERE id_visita = ?
        `,
        [tecnicoFinal, idTicketFinal, ESTADOS_VISITA.CONFIRMADA, id]
    );

    return obtenerVisitaPorId(id);
}

const reprogramarVisita = async (id, datos) => {
    const { fecha_solicitada, hora_solicitada } = datos;

    if (!fecha_solicitada || !hora_solicitada) {
        throw crearError("La nueva fecha y hora son requeridas.", 400);
    }

    validarFechaFutura(fecha_solicitada, hora_solicitada);

    const visita = await obtenerVisitaCruda(id);

    if (ESTADOS_TERMINALES.includes(visita.estado)) {
        throw crearError("Esta visita ya no puede reprogramarse.", 409);
    }

    await pool.query(
        `
        UPDATE visita_tecnica
        SET
            fecha_solicitada = ?,
            hora_solicitada = ?,
            estado = ?
        WHERE id_visita = ?
        `,
        [fecha_solicitada, hora_solicitada, ESTADOS_VISITA.REPROGRAMADA, id]
    );

    return obtenerVisitaPorId(id);
}

const asignarTecnico = async (id, datos) => {
    const { id_tecnico } = datos;

    if (!id_tecnico) {
        throw crearError("El id del técnico es requerido.", 400);
    }

    await verificarTecnicoExiste(id_tecnico);

    const visita = await obtenerVisitaCruda(id);

    if (ESTADOS_TERMINALES.includes(visita.estado)) {
        throw crearError("Esta visita ya no puede reasignarse.", 409);
    }

    await pool.query(
        "UPDATE visita_tecnica SET id_tecnico = ? WHERE id_visita = ?",
        [id_tecnico, id]
    );

    return obtenerVisitaPorId(id);
}

// Recepcion/Administrador pueden cancelar en cualquier momento no-terminal;
// el Cliente solo puede cancelar su propia visita mientras siga
// Pendiente/Confirmada (una vez que el tecnico ya esta en camino, tiene que
// coordinarse con el staff, no cancelar solo desde el portal).
const cancelarVisita = async (id, solicitante) => {
    const visita = await obtenerVisitaCruda(id);

    if (ESTADOS_TERMINALES.includes(visita.estado)) {
        throw crearError("Esta visita ya no puede cancelarse.", 409);
    }

    if (solicitante.rol === ROLES.CLIENTE) {
        if (Number(visita.id_usuario) !== Number(solicitante.id_usuario)) {
            throw crearError("No tenés permisos para cancelar esta visita.", 403);
        }

        if (![ESTADOS_VISITA.PENDIENTE, ESTADOS_VISITA.CONFIRMADA].includes(visita.estado)) {
            throw crearError("Esta visita ya no se puede cancelar desde tu cuenta; contactá a soporte.", 409);
        }
    }

    await pool.query(
        "UPDATE visita_tecnica SET estado = ? WHERE id_visita = ?",
        [ESTADOS_VISITA.CANCELADA, id]
    );

    return obtenerVisitaPorId(id);
}

// transiciones que hace el propio tecnico durante la visita
const ESTADOS_TECNICO_PERMITIDOS = [
    ESTADOS_VISITA.EN_CAMINO,
    ESTADOS_VISITA.EN_PROGRESO,
    ESTADOS_VISITA.FINALIZADA
];

const cambiarEstadoPropia = async (id, estado, solicitante, observaciones) => {
    if (typeof estado !== "string" || !ESTADOS_TECNICO_PERMITIDOS.includes(estado.trim())) {
        throw crearError(
            `Estado inválido. Debe ser: ${ESTADOS_TECNICO_PERMITIDOS.join(", ")}.`,
            400
        );
    }

    const estadoNormalizado = estado.trim();

    const visita = await obtenerVisitaCruda(id);

    if (ESTADOS_TERMINALES.includes(visita.estado)) {
        throw crearError("Esta visita ya no puede cambiar de estado.", 409);
    }

    if (solicitante.rol === ROLES.TECNICO && Number(visita.id_tecnico) !== Number(solicitante.id_usuario)) {
        throw crearError("No tenés permisos sobre esta visita.", 403);
    }

    // Finalizar exige que el diagnostico del ticket vinculado ya este
    // registrado — mismo espiritu que el gate de "Resuelto" en ticket.service.
    if (estadoNormalizado === ESTADOS_VISITA.FINALIZADA) {
        if (!visita.id_ticket) {
            throw crearError("La visita todavía no está vinculada a un ticket.", 409);
        }

        const [diagnosticos] = await pool.query(
            "SELECT id_diagnostico FROM diagnostico WHERE id_ticket = ?",
            [visita.id_ticket]
        );

        if (diagnosticos.length === 0) {
            throw crearError("Debe registrarse el diagnóstico del ticket antes de finalizar la visita.", 409);
        }
    }

    // observaciones es opcional en cada cambio de estado — si no viene, se
    // conserva lo que ya hubiera (no se borra una nota anterior sin querer).
    const observacionesFinal = observaciones !== undefined ? observaciones : visita.observaciones;

    await pool.query(
        "UPDATE visita_tecnica SET estado = ?, observaciones = ? WHERE id_visita = ?",
        [estadoNormalizado, observacionesFinal, id]
    );

    return obtenerVisitaPorId(id);
}

module.exports = {
    crearVisita,
    obtenerVisitas,
    obtenerVisitasDeUsuario,
    obtenerVisitasDeTecnico,
    obtenerDisponibilidad,
    obtenerVisitaPorId,
    confirmarVisita,
    reprogramarVisita,
    asignarTecnico,
    cancelarVisita,
    cambiarEstadoPropia
}
