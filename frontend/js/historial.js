//========================================
// ITDESK - HISTORIAL (CLIENTE)
//========================================
// Reutiliza GET /ticket/mis (no hay endpoint separado de "historial") y
// filtra a Resuelto/Cerrado en el cliente.

let historialTickets = [];
let ordenHistorial = { campo: null, direccion: "asc" };
const ORDEN_ESTADO_HISTORIAL = { Resuelto: 0, Cerrado: 1 };
const EXTRACTORES_ORDEN_HISTORIAL = {
    estado: t => ORDEN_ESTADO_HISTORIAL[t.estado] ?? 9
};

async function cargarHistorial() {
    const tabla = document.getElementById("tablaHistorial");
    if (!tabla) {
        return;
    }

    UI.renderSkeleton(tabla, 7);

    try {
        const tickets = await apiFetch("/ticket/mis");
        historialTickets = tickets.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado");

        if (historialTickets.length === 0) {
            UI.renderEmptyState(tabla, 7, "Todavía no tienes tickets resueltos o cerrados.", "bi-clock-history");
            return;
        }

        actualizarTablaHistorial();

    } catch (error) {
        UI.renderErrorRow(tabla, 7, error.message);
    }
}

function actualizarTablaHistorial() {
    const tabla = document.getElementById("tablaHistorial");

    const datos = ordenHistorial.campo
        ? Ordenar.aplicar(historialTickets, ordenHistorial.campo, ordenHistorial.direccion, EXTRACTORES_ORDEN_HISTORIAL[ordenHistorial.campo])
        : historialTickets;

    UI.paginarRender(datos, (visibles) => {
        tabla.innerHTML = visibles.map(ticket => `
            <tr>
                <td data-label="ID"><span class="codigo">${Codigos.ticket(ticket)}</span></td>
                <td data-label="Equipo">${ticket.equipo_tipo} ${ticket.equipo_marca}</td>
                <td data-label="Título">${ticket.titulo}</td>
                <td data-label="Estado">${UI.badgeEstado(ticket.estado)}</td>
                <td data-label="Apertura">${UI.formatearFechaCorta(ticket.fecha_apertura)}</td>
                <td data-label="Cierre">${UI.formatearFechaCorta(ticket.fecha_cierre)}</td>
                <td data-label="Detalle">
                    <a class="btn btn-outline-primary btn-sm" href="ticket-cliente.html?id=${ticket.id_ticket}">
                        <i class="bi bi-eye"></i> Ver
                    </a>
                </td>
            </tr>
        `).join("");
    }, document.getElementById("verMasHistorial"));
}

document.addEventListener("DOMContentLoaded", () => {
    cargarHistorial();

    Ordenar.conectar(document.getElementById("tablaHistorial")?.closest("table"), (campo, direccion) => {
        ordenHistorial = { campo, direccion };
        actualizarTablaHistorial();
    });
});
