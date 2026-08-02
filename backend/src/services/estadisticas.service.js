const pool = require("../config/database");

// Metricas agregadas para la landing publica (index.html, sin login) — solo
// conteos, nunca una fila individual de ticket/usuario: es la unica
// pantalla del sistema sin sesion, no debe exponer datos puntuales.
const obtenerEstadisticasPublicas = async () => {
    const [filas] = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM ticket) AS total_tickets,
            (SELECT COUNT(*) FROM usuario WHERE rol = 'Cliente' AND estado = 'Activo') AS clientes_activos,
            (SELECT COUNT(*) FROM usuario WHERE rol = 'Tecnico') AS tecnicos_especializados,
            (SELECT COUNT(*) FROM ticket WHERE estado IN ('Resuelto', 'Cerrado')) AS tickets_resueltos
    `);
    const fila = filas[0];

    // (Resueltos / Total) x 100, 1 decimal como maximo — 0 si no hay
    // tickets, division por cero evitada a proposito (mismo criterio que
    // ya usa el dashboard del administrador).
    const totalTickets = fila.total_tickets;
    const porcentajeResueltos = totalTickets > 0
        ? Math.round((fila.tickets_resueltos / totalTickets) * 1000) / 10
        : 0;

    return {
        tickets_registrados: totalTickets,
        clientes_activos: fila.clientes_activos,
        tecnicos_especializados: fila.tecnicos_especializados,
        porcentaje_resueltos: porcentajeResueltos
    };
};

module.exports = { obtenerEstadisticasPublicas };
