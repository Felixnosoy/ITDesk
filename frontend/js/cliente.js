//========================================
// ITDESK - CLIENTE (dashboard-cliente.html)
//========================================
// "Debe transmitir tranquilidad": el ticket activo mas reciente (si hay uno)
// se destaca arriba con su ultima novedad, antes de la tabla completa.

let ticketsClienteActivos = [];
let ordenCliente = { campo: null, direccion: "asc" };
const ORDEN_ESTADO_CLIENTE = { Abierto: 0, "En proceso": 1, Resuelto: 2 };
const EXTRACTORES_ORDEN_CLIENTE = {
    estado: t => ORDEN_ESTADO_CLIENTE[t.estado] ?? 9
};

async function cargarTicketsCliente() {
    const tabla = document.getElementById("tablaTickets");
    if (!tabla) {
        return;
    }

    UI.renderSkeleton(tabla, 6);
    renderSkeletonDestacada();

    try {
        const tickets = await apiFetch("/ticket/mis");

        document.getElementById("totalTickets").textContent = tickets.length;
        document.getElementById("ticketsProceso").textContent =
            tickets.filter(t => t.estado === "En proceso").length;
        document.getElementById("ticketsResueltos").textContent =
            tickets.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado").length;

        await renderSeccionDestacada(tickets);

        // La tabla del dashboard es para lo activo — "Cerrado" ya tiene su
        // propio lugar en Historial, mezclarlos aca es ruido en la pantalla
        // que mas debe transmitir tranquilidad (Fase 2.5, Hallazgo 10).
        ticketsClienteActivos = tickets.filter(t => t.estado !== "Cerrado");

        if (tickets.length === 0) {
            UI.renderEmptyState(tabla, 6, "Todavía no tienes tickets registrados. Visita o contacta a soporte para abrir uno.", "bi-ticket-perforated");
            return;
        }

        renderTablaTicketsCliente();

    } catch (error) {
        UI.renderErrorRow(tabla, 6, error.message);
        document.getElementById("seccionDestacada").innerHTML = "";
    }
}

function renderTablaTicketsCliente() {
    const tabla = document.getElementById("tablaTickets");

    if (ticketsClienteActivos.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="bi bi-check-circle"></i>
                        <p class="mb-0">No tienes tickets activos. Revisa tus tickets anteriores en
                            <a href="historial.html">Historial</a>.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const datos = ordenCliente.campo
        ? Ordenar.aplicar(ticketsClienteActivos, ordenCliente.campo, ordenCliente.direccion, EXTRACTORES_ORDEN_CLIENTE[ordenCliente.campo])
        : ticketsClienteActivos;

    tabla.innerHTML = datos.map(ticket => `
        <tr>
            <td data-label="ID">${Codigos.ticket(ticket)}</td>
            <td data-label="Equipo">${ticket.equipo_tipo} ${ticket.equipo_marca}</td>
            <td data-label="Título">${ticket.titulo}</td>
            <td data-label="Categoría">${UI.badgeCategoria(ticket.categoria)}</td>
            <td data-label="Estado">${UI.badgeEstado(ticket.estado)}</td>
            <td data-label="Detalle">
                <a class="btn btn-outline-primary btn-sm" href="ticket-cliente.html?id=${ticket.id_ticket}">
                    <i class="bi bi-eye"></i> Ver
                </a>
            </td>
        </tr>
    `).join("");
}

function renderSkeletonDestacada() {
    document.getElementById("seccionDestacada").innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <span class="skeleton-line" style="height:20px;width:40%;"></span>
                <span class="skeleton-line mt-2" style="height:14px;width:70%;"></span>
            </div>
        </div>
    `;
}

async function renderSeccionDestacada(tickets) {
    const contenedor = document.getElementById("seccionDestacada");
    const activo = tickets.find(t => t.estado === "Abierto" || t.estado === "En proceso");

    if (!activo) {
        contenedor.innerHTML = `
            <div class="card shadow-sm card-accent card-accent-success">
                <div class="card-body d-flex align-items-center gap-3">
                    <i class="bi bi-emoji-smile display-5 text-success"></i>
                    <div>
                        <h5 class="mb-1">Estás al día</h5>
                        <p class="mb-0 text-muted">No tienes reparaciones en curso en este momento.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    let ultimaNota = null;
    try {
        const notas = await apiFetch(`/actualizacion/notas/${activo.id_ticket}`);
        ultimaNota = notas[notas.length - 1] || null;
    } catch {
        // si falla la nota, igual mostramos el estado del ticket
    }

    contenedor.innerHTML = `
        <div class="card shadow-sm card-accent card-accent-warning">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                        <span class="eyebrow">Reparación en curso</span>
                        <h5 class="mb-1 mt-1">${Codigos.ticket(activo)} — ${activo.titulo}</h5>
                        <p class="mb-0 text-muted">${activo.equipo_tipo} ${activo.equipo_marca} ${activo.equipo_modelo}</p>
                    </div>
                    ${UI.badgeEstado(activo.estado)}
                </div>
                ${ultimaNota ? `
                    <div class="mt-3 pt-3 border-top">
                        <small class="text-muted d-block mb-1">Última novedad · ${UI.formatearFecha(ultimaNota.fecha_actualizacion)}</small>
                        <p class="mb-0">${ultimaNota.observaciones}</p>
                    </div>
                ` : ""}
                <a class="btn btn-primary btn-sm mt-3" href="ticket-cliente.html?id=${activo.id_ticket}">
                    <i class="bi bi-eye"></i> Ver seguimiento completo
                </a>
            </div>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    cargarTicketsCliente();

    Ordenar.conectar(document.getElementById("tablaTickets")?.closest("table"), (campo, direccion) => {
        ordenCliente = { campo, direccion };
        renderTablaTicketsCliente();
    });
});
