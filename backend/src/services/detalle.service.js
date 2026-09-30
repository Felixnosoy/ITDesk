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
// tecnico, estado), diagnostico vigente, linea de tiempo de novedades y
// notas privadas. cotizable dice si ya tiene diagnostico, requisito para
// armar una cotizacion.
const obtenerDetalle = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);

    const [diagnostico, actualizaciones, notas] = await Promise.all([
        diagnosticoService.obtenerDiagnosticoDeTicket(ticket.id_ticket),
        seguimientoService.obtenerActualizaciones(ticket.id_ticket),
        seguimientoService.obtenerNotas(ticket.id_ticket)
    ]);

    return {
        ticket,
        diagnostico,
        cotizable: diagnostico !== null,
        actualizaciones: await conAdjuntos(actualizaciones, "id_actualizacion", "id_actualizacion"),
        notas_privadas: await conAdjuntos(notas, "id_nota", "id_nota")
    };
};

module.exports = {
    obtenerDetalle
};
