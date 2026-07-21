const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ticketService = require("../services/ticket.service")
const { verificarTecnicoExiste } = require("../validators/usuario.validator")

const COLUMNAS_DIAGNOSTICO = `
    d.id_diagnostico,
    d.id_ticket,
    d.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS tecnico,
    d.diagnostico,
    d.solucion,
    d.observaciones,
    d.fecha_diagnostico
`;

const JOIN_DIAGNOSTICO = `
    FROM diagnostico d
    INNER JOIN usuario u
        ON d.id_usuario = u.id_usuario
`;

const crearDiagnostico = async (datosDiagnostico) => {
    const {
        id_ticket,
        id_usuario: id_tecnico,
        diagnostico,
        solucion,
        observaciones
    } = datosDiagnostico;

    if (!id_ticket || !id_tecnico || !diagnostico) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const diagnosticoNormalizado = diagnostico.trim();
    const solucionNormalizada = solucion?.trim() || null;
    const observacionesNormalizadas = observaciones?.trim() || null;

    // Verificar que el ticket exista
    await ticketService.obtenerTicketPorId(id_ticket);

    // Verificar que el usuario exista y tenga rol de Tecnico
    await verificarTecnicoExiste(id_tecnico);

    // Insertar diagnostico (fecha_diagnostico la asigna la base de datos)
    const [resultado] = await pool.query(
        `
        INSERT INTO diagnostico (
            id_ticket,
            id_usuario,
            diagnostico,
            solucion,
            observaciones
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            id_ticket,
            id_tecnico,
            diagnosticoNormalizado,
            solucionNormalizada,
            observacionesNormalizadas
        ]
    );

    const [diagnosticos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DIAGNOSTICO}
        ${JOIN_DIAGNOSTICO}
        WHERE d.id_diagnostico = ?
        `,
        [resultado.insertId]
    );

    return diagnosticos[0];
}

// este get sirve para obtener todos los diagnosticos registrados

const obtenerDiagnosticos = async () => {

    const [diagnosticos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DIAGNOSTICO}
        ${JOIN_DIAGNOSTICO}
        ORDER BY d.id_diagnostico DESC
        `
    );

    return diagnosticos;
}

// este get sirve para obtener un diagnostico en especifico por su id

const obtenerDiagnosticoPorId = async (id) => {

    const [diagnosticos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DIAGNOSTICO}
        ${JOIN_DIAGNOSTICO}
        WHERE d.id_diagnostico = ?
        `,
        [id]
    );

    if (diagnosticos.length === 0) {
        throw crearError("Diagnóstico no encontrado", 404);
    }

    return diagnosticos[0];
}

// este get sirve para obtener el historial de diagnosticos de un ticket

const obtenerDiagnosticosPorTicket = async (id_ticket) => {

    await ticketService.obtenerTicketPorId(id_ticket);

    const [diagnosticos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DIAGNOSTICO}
        ${JOIN_DIAGNOSTICO}
        WHERE d.id_ticket = ?
        ORDER BY d.id_diagnostico DESC
        `,
        [id_ticket]
    );

    return diagnosticos;
}

// este get sirve para obtener los diagnosticos hechos por un tecnico

const obtenerDiagnosticosPorTecnico = async (id_tecnico) => {

    await verificarTecnicoExiste(id_tecnico);

    const [diagnosticos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_DIAGNOSTICO}
        ${JOIN_DIAGNOSTICO}
        WHERE d.id_usuario = ?
        ORDER BY d.id_diagnostico DESC
        `,
        [id_tecnico]
    );

    return diagnosticos;
}

const actualizarDiagnostico = async (id, nuevosDatos) => {

    const {
        diagnostico,
        solucion,
        observaciones
    } = nuevosDatos;

    if (!diagnostico) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const diagnosticoNormalizado = diagnostico.trim();
    const solucionNormalizada = solucion?.trim() || null;
    const observacionesNormalizadas = observaciones?.trim() || null;

    // Verificar que el diagnostico exista
    await obtenerDiagnosticoPorId(id);

    await pool.query(
        `
        UPDATE diagnostico
        SET
            diagnostico = ?,
            solucion = ?,
            observaciones = ?
        WHERE id_diagnostico = ?
        `,
        [diagnosticoNormalizado, solucionNormalizada, observacionesNormalizadas, id]
    );

    return obtenerDiagnosticoPorId(id);
}

const eliminarDiagnostico = async (id) => {

    // Verificar que el diagnostico exista
    await obtenerDiagnosticoPorId(id);

    await pool.query(
        `
        DELETE FROM diagnostico
        WHERE id_diagnostico = ?
        `,
        [id]
    );
}

module.exports = {
    crearDiagnostico,
    obtenerDiagnosticos,
    obtenerDiagnosticoPorId,
    obtenerDiagnosticosPorTicket,
    obtenerDiagnosticosPorTecnico,
    actualizarDiagnostico,
    eliminarDiagnostico
}
