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

// Los 3 nodos del mini-timeline por tarjeta — la lista de cliente ya excluye
// "Cerrado" (ver mas abajo), asi que nunca hace falta un 4to nodo aca.
const PASOS_TIMELINE_CLIENTE = ["Abierto", "En proceso", "Resuelto"];

async function cargarTicketsCliente() {
    const lista = document.getElementById("listaTickets");
    if (!lista) {
        return;
    }

    renderSkeletonLista();
    renderSkeletonDestacada();

    try {
        const tickets = await apiFetch("/ticket/mis");

        document.getElementById("totalTickets").textContent = tickets.length;
        document.getElementById("ticketsProceso").textContent =
            tickets.filter(t => t.estado === "En proceso").length;
        document.getElementById("ticketsResueltos").textContent =
            tickets.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado").length;

        await renderSeccionDestacada(tickets);

        // La lista del dashboard es para lo activo — "Cerrado" ya tiene su
        // propio lugar en Historial, mezclarlos aca es ruido en la pantalla
        // que mas debe transmitir tranquilidad (Fase 2.5, Hallazgo 10).
        ticketsClienteActivos = tickets.filter(t => t.estado !== "Cerrado");

        if (tickets.length === 0) {
            lista.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-ticket-perforated"></i>
                    <p class="mb-0">Todavía no tienes tickets registrados. Visita o contacta a soporte para abrir uno.</p>
                </div>
            `;
            return;
        }

        renderListaTicketsCliente();

    } catch (error) {
        lista.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <p class="mb-0 text-danger">${error.message}</p>
            </div>
        `;
        document.getElementById("seccionDestacada").innerHTML = "";
    }
}

function renderSkeletonLista() {
    const lista = document.getElementById("listaTickets");
    lista.innerHTML = Array.from({ length: 3 }).map(() => `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100">
                <div class="card-body">
                    <span class="skeleton-line" style="height:16px;width:60%;"></span>
                    <span class="skeleton-line mt-2" style="height:12px;width:40%;"></span>
                    <span class="skeleton-line mt-3" style="height:20px;"></span>
                </div>
            </div>
        </div>
    `).join("");
}

function renderListaTicketsCliente() {
    const lista = document.getElementById("listaTickets");

    if (ticketsClienteActivos.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-check-circle"></i>
                <p class="mb-0">No tienes tickets activos. Revisa tus tickets anteriores en
                    <a href="historial.html">Historial</a>.</p>
            </div>
        `;
        return;
    }

    const datos = ordenCliente.campo
        ? Ordenar.aplicar(ticketsClienteActivos, ordenCliente.campo, ordenCliente.direccion, EXTRACTORES_ORDEN_CLIENTE[ordenCliente.campo])
        : ticketsClienteActivos;

    lista.innerHTML = datos.map(ticket => {
        const pasoActual = PASOS_TIMELINE_CLIENTE.indexOf(ticket.estado);
        const pasos = PASOS_TIMELINE_CLIENTE.map((paso, indice) => `
            ${indice > 0 ? '<div class="step-line"></div>' : ""}
            <div class="step sm ${indice < pasoActual ? "done" : ""} ${indice === pasoActual ? "active" : ""}">
                <span class="step-circle"><i class="bi ${indice <= pasoActual ? "bi-check-lg" : "bi-circle"}"></i></span>
            </div>
        `).join("");

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div>
                                <span class="codigo text-muted small">${Codigos.ticket(ticket)}</span>
                                <h5 class="mb-0">${ticket.titulo}</h5>
                            </div>
                            ${UI.badgeCategoria(ticket.categoria)}
                        </div>
                        <p class="text-muted small mb-3">${ticket.equipo_tipo} ${ticket.equipo_marca}</p>
                        <div class="step-indicator sm mt-auto mb-2">${pasos}</div>
                        ${UI.badgeEstado(ticket.estado)}
                        <a class="btn btn-outline-primary btn-sm mt-3" href="ticket-cliente.html?id=${ticket.id_ticket}">
                            <i class="bi bi-eye"></i> Ver
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join("");
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
                        <h5 class="mb-1 mt-1"><span class="codigo">${Codigos.ticket(activo)}</span> — ${activo.titulo}</h5>
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

    document.getElementById("ordenListaCliente")?.addEventListener("change", (evento) => {
        const [campo, direccion] = evento.target.value.split(":");
        ordenCliente = { campo: campo || null, direccion: direccion || "asc" };
        renderListaTicketsCliente();
    });
});
