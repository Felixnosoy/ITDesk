const ROLES = require("../constants/roles");
const ticketService = require("./ticket.service");
const diagnosticoService = require("./diagnostico.service");
const seguimientoService = require("./seguimiento.service");
const archivoService = require("./archivo.service");

// Pega a cada fila sus adjuntos, buscados en una sola consulta.
const conAdjuntos = async (filas, columna, clave) => {
    const adjuntos = await archivoService.obtenerAdjuntosPorPadre(columna, filas.map((f) => f[clave]));

    return filas.map((fila) => ({ ...fila, adjuntos: adjuntos.get(fila[clave]) ?? [] }));
};

// Todo lo del ticket en una sola respuesta: resumen (cliente, equipo,
// tecnico, estado), diagnostico vigente, linea de tiempo de novedades y,
// solo para el taller, notas privadas. cotizable dice si ya tiene
// diagnostico, requisito para armar una cotizacion.
//
// Visibilidad del Cliente: un ticket ajeno responde 404 (lo resuelve
// obtenerTicketPorId) y las notas privadas ni siquiera se consultan, asi
// no pueden filtrarse por error; la clave notas_privadas no aparece.
const obtenerDetalle = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    const esCliente = usuario.rol === ROLES.CLIENTE;

    const [diagnostico, actualizaciones, notas] = await Promise.all([
        diagnosticoService.obtenerDiagnosticoDeTicket(ticket.id_ticket),
        seguimientoService.obtenerActualizaciones(ticket.id_ticket),
        esCliente ? null : seguimientoService.obtenerNotas(ticket.id_ticket)
    ]);

    const detalle = {
        ticket,
        diagnostico,
        cotizable: diagnostico !== null,
        actualizaciones: await conAdjuntos(actualizaciones, "id_actualizacion", "id_actualizacion")
    };

    if (!esCliente) {
        detalle.notas_privadas = await conAdjuntos(notas, "id_nota", "id_nota");
    }

    return detalle;
};

module.exports = {
    obtenerDetalle
};
