const ROLES = require("../constants/roles");
const ticketService = require("./ticket.service");
const diagnosticoService = require("./diagnostico.service");
const seguimientoService = require("./seguimiento.service");
const archivoService = require("./archivo.service");
const cotizacionService = require("./cotizacion.service");
const facturaService = require("./factura.service");
const ESTADOS_TICKET = require("../constants/estadosTicket");
const ESTADOS_COTIZACION = require("../constants/estadosCotizacion");
const { estadosSiguientes } = require("./estado.service");

// Pega a cada fila sus adjuntos, buscados en una sola consulta.
const conAdjuntos = async (filas, columna, clave) => {
    const adjuntos = await archivoService.obtenerAdjuntosPorPadre(columna, filas.map((f) => f[clave]));

    return filas.map((fila) => ({ ...fila, adjuntos: adjuntos.get(fila[clave]) ?? [] }));
};

const esCotizable = (ticket, diagnostico, cotizaciones) =>
    diagnostico !== null
    && ![ESTADOS_TICKET.RESUELTO, ESTADOS_TICKET.CERRADO].includes(ticket.estado)
    && !cotizaciones.some((c) => c.estado !== ESTADOS_COTIZACION.RECHAZADA);

// Todo lo del ticket en una sola respuesta: resumen (cliente, equipo,
// tecnico, estado), diagnostico vigente, linea de tiempo de novedades y,
// solo para el taller, notas privadas y los estados a los que se puede
// pasar el ticket (para que la pantalla ofrezca solo esos). cotizaciones
// trae todas las del ticket con sus lineas, de la mas nueva a la mas vieja.
// cotizable dice si ahora mismo se puede armar una: tiene diagnostico, no
// esta resuelto ni cerrado y no hay otra Pendiente o Aprobada. factura es
// la del ticket o null; facturable (solo para el taller) dice si ya se
// puede generar: hay una cotizacion Aprobada sin facturar.
//
// Visibilidad del Cliente: un ticket ajeno responde 404 (lo resuelve
// obtenerTicketPorId) y las notas privadas ni siquiera se consultan, asi
// no pueden filtrarse por error; la clave notas_privadas no aparece.
const obtenerDetalle = async (idTicket, usuario) => {
    const ticket = await ticketService.obtenerTicketPorId(idTicket, usuario);
    const esCliente = usuario.rol === ROLES.CLIENTE;

    const [diagnostico, cotizaciones, factura, actualizaciones, notas] = await Promise.all([
        diagnosticoService.obtenerDiagnosticoDeTicket(ticket.id_ticket),
        cotizacionService.obtenerCotizacionesDeTicket(ticket.id_ticket),
        facturaService.obtenerFacturaDeTicket(ticket.id_ticket),
        seguimientoService.obtenerActualizaciones(ticket.id_ticket),
        esCliente ? null : seguimientoService.obtenerNotas(ticket.id_ticket)
    ]);

    const detalle = {
        ticket,
        diagnostico,
        cotizable: esCotizable(ticket, diagnostico, cotizaciones),
        cotizaciones,
        factura,
        actualizaciones: await conAdjuntos(actualizaciones, "id_actualizacion", "id_actualizacion")
    };

    if (!esCliente) {
        detalle.notas_privadas = await conAdjuntos(notas, "id_nota", "id_nota");
        detalle.estados_siguientes = estadosSiguientes(ticket.estado);
        detalle.facturable = factura === null
            && ticket.estado !== ESTADOS_TICKET.CERRADO
            && cotizaciones.some((c) => c.estado === ESTADOS_COTIZACION.APROBADA);
    }

    return detalle;
};

module.exports = {
    obtenerDetalle
};
