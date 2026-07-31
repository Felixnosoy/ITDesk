//========================================
// ITDESK - PANEL DE RECEPCION (dashboard-recepcion.html)
//========================================
// Pantalla de inicio del rol Recepcionista: metricas del dia, consulta
// rapida de un ticket (para atender una llamada sin abrir el wizard) y
// directorio de clientes con ficha. Todo se arma sobre GET /ticket,
// GET /usuarios y GET /equipo, los mismos endpoints masivos que el rol
// ya tenia permitidos - los endpoints de un solo registro (GET /ticket/:id,
// GET /equipo/:id) NO estan abiertos a Recepcionista, por eso todo se
// resuelve cruzando estas listas completas en memoria en vez de pedir
// un registro suelto. GET /asignacion tampoco esta abierto a este rol
// (solo Administrador/Tecnico) asi que la consulta rapida no puede
// mostrar el tecnico asignado - se limita a estado y tiempo abierto.

let ticketsCacheRecepcion = [];
let clientesCacheRecepcion = [];
let equiposPorClienteRecepcion = {};

async function cargarPanelRecepcion() {
    try {
        const [tickets, usuarios, equipos] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/usuarios"),
            apiFetch("/equipo").catch(() => [])
        ]);

        ticketsCacheRecepcion = tickets;

        clientesCacheRecepcion = usuarios.filter(u => u.rol === "Cliente");

        equiposPorClienteRecepcion = {};
        equipos.forEach(e => {
            if (!equiposPorClienteRecepcion[e.id_usuario]) {
                equiposPorClienteRecepcion[e.id_usuario] = [];
            }
            equiposPorClienteRecepcion[e.id_usuario].push(e);
        });

        renderMetricasRecepcion();
        renderUltimosClientesRecepcion();
    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function renderMetricasRecepcion() {
    const hoy = new Date().toDateString();
    document.getElementById("statsTicketsHoy").textContent =
        ticketsCacheRecepcion.filter(t => new Date(t.fecha_apertura).toDateString() === hoy).length;
    document.getElementById("statsSinTecnico").textContent =
        ticketsCacheRecepcion.filter(t => t.estado === "Abierto").length;
    document.getElementById("statsClientes").textContent = clientesCacheRecepcion.length;
}

function renderUltimosClientesRecepcion() {
    const cont = document.getElementById("ultimosClientes");
    const ultimos = [...clientesCacheRecepcion]
        .sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro))
        .slice(0, 5);

    if (ultimos.length === 0) {
        cont.innerHTML = `<p class="text-muted small mb-0">Todavía no hay clientes registrados.</p>`;
        return;
    }

    cont.innerHTML = ultimos.map(u => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <div class="small fw-semibold">${u.nombre} ${u.apellido}</div>
                <div class="small text-muted"><span class="codigo">${Codigos.cliente(u)}</span> · ${u.correo}</div>
            </div>
            <span class="small text-muted">${new Date(u.fecha_registro).toLocaleDateString("es-ES")}</span>
        </div>
    `).join("");
}

//========================================
// Consulta rapida (typeahead de tickets)
//========================================

function tiempoTranscurridoRecepcion(fechaIso) {
    const dias = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 86400000);
    if (dias < 1) return "hoy";
    if (dias === 1) return "hace 1 día";
    return `hace ${dias} días`;
}

function renderConsultaRapida(termino) {
    const panel = document.getElementById("consultaRapidaPanel");
    const input = document.getElementById("consultaRapidaInput");

    if (!termino) {
        panel.classList.add("d-none");
        panel.innerHTML = "";
        input.setAttribute("aria-expanded", "false");
        return 0;
    }

    // el ticket no trae telefono propio - se cruza con el cliente por id_usuario
    const clientesPorId = new Map(clientesCacheRecepcion.map(c => [c.id_usuario, c]));
    const enriquecidos = ticketsCacheRecepcion.map(t => ({
        ...t,
        _telefono: clientesPorId.get(t.id_usuario)?.telefono || ""
    }));

    const encontrados = Search.filtrar(enriquecidos, termino, [
        "titulo", "cliente", "_telefono", t => Codigos.ticket(t)
    ]).slice(0, 8);

    if (encontrados.length === 0) {
        panel.innerHTML = `<div class="p-3 text-muted small">Ningún ticket coincide con "${termino}".</div>`;
    } else {
        panel.innerHTML = encontrados.map(t => `
            <button type="button" class="typeahead-item" data-id="${t.id_ticket}">
                <span class="codigo">${Codigos.ticket(t)}</span>
                <div class="small fw-semibold">${t.titulo}</div>
                <div class="text-muted small">${t.cliente}</div>
            </button>
        `).join("");

        panel.querySelectorAll(".typeahead-item").forEach(item => {
            item.addEventListener("click", () => mostrarConsultaRapida(Number(item.dataset.id)));
        });
    }

    panel.classList.remove("d-none");
    input.setAttribute("aria-expanded", "true");
    return encontrados.length;
}

function mostrarConsultaRapida(idTicket) {
    const ticket = ticketsCacheRecepcion.find(t => t.id_ticket === idTicket);
    document.getElementById("consultaRapidaPanel").classList.add("d-none");
    document.getElementById("consultaRapidaInput").setAttribute("aria-expanded", "false");
    if (!ticket) return;

    const cont = document.getElementById("consultaRapidaResultado");
    cont.innerHTML = `
        <div class="border rounded-3 p-3">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                    <span class="codigo">${Codigos.ticket(ticket)}</span>
                    <div class="fw-semibold">${ticket.titulo}</div>
                </div>
                ${UI.badgeEstado(ticket.estado)}
            </div>
            <div class="text-muted small mt-2">${ticket.cliente} · ${ticket.equipo_tipo || ""} ${ticket.equipo_marca || ""}</div>
            <div class="text-muted small">Abierto ${tiempoTranscurridoRecepcion(ticket.fecha_apertura)}</div>
        </div>
    `;
}

//========================================
// Directorio de clientes (typeahead + ficha)
//========================================

function renderDirectorio(termino) {
    const panel = document.getElementById("directorioPanel");
    const input = document.getElementById("directorioInput");

    if (!termino) {
        panel.classList.add("d-none");
        panel.innerHTML = "";
        input.setAttribute("aria-expanded", "false");
        return 0;
    }

    const encontrados = Search.filtrar(clientesCacheRecepcion, termino, [
        "nombre", "apellido", "correo", "telefono", "num_documento", c => Codigos.cliente(c)
    ]).slice(0, 8);

    if (encontrados.length === 0) {
        panel.innerHTML = `<div class="p-3 text-muted small">Ningún cliente coincide con "${termino}".</div>`;
    } else {
        panel.innerHTML = encontrados.map(u => `
            <button type="button" class="typeahead-item" data-id="${u.id_usuario}">
                <strong>${u.nombre} ${u.apellido}</strong> <span class="codigo text-muted">${Codigos.cliente(u)}</span>
                <div class="text-muted small">${u.correo}${u.telefono ? " · " + u.telefono : ""}</div>
            </button>
        `).join("");

        panel.querySelectorAll(".typeahead-item").forEach(item => {
            item.addEventListener("click", () => mostrarFichaCliente(Number(item.dataset.id)));
        });
    }

    panel.classList.remove("d-none");
    input.setAttribute("aria-expanded", "true");
    return encontrados.length;
}

function mostrarFichaCliente(idUsuario) {
    const cliente = clientesCacheRecepcion.find(u => u.id_usuario === idUsuario);
    document.getElementById("directorioPanel").classList.add("d-none");
    document.getElementById("directorioInput").setAttribute("aria-expanded", "false");
    if (!cliente) return;

    const misTickets = ticketsCacheRecepcion.filter(t => t.id_usuario === idUsuario);
    const misEquipos = equiposPorClienteRecepcion[idUsuario] || [];

    const cont = document.getElementById("directorioFicha");
    cont.innerHTML = `
        <div class="border rounded-3 p-3">
            <div class="fw-semibold">${cliente.nombre} ${cliente.apellido}</div>
            <div class="text-muted small"><span class="codigo">${Codigos.cliente(cliente)}</span> · ${cliente.correo}${cliente.telefono ? " · " + cliente.telefono : ""}</div>
            <hr>
            <div class="small fw-semibold mb-1">Equipos (${misEquipos.length})</div>
            ${misEquipos.length === 0
                ? `<p class="text-muted small">Sin equipos registrados.</p>`
                : misEquipos.map(e => `<div class="small text-muted">· ${e.tipo} ${e.marca} ${e.modelo} — ${e.estado}</div>`).join("")}
            <div class="small fw-semibold mb-1 mt-2">Tickets (${misTickets.length})</div>
            ${misTickets.length === 0
                ? `<p class="text-muted small">Sin tickets registrados.</p>`
                : misTickets.slice(0, 5).map(t => `
                    <div class="small text-muted">· <span class="codigo">${Codigos.ticket(t)}</span> ${UI.badgeEstado(t.estado)}</div>
                `).join("")}
        </div>
    `;
}

//========================================
// Inicializacion
//========================================

document.addEventListener("DOMContentLoaded", () => {
    cargarPanelRecepcion();

    Search.conectar(document.getElementById("consultaRapidaInput"), renderConsultaRapida, "resultadosConsultaRapida");
    Search.conectar(document.getElementById("directorioInput"), renderDirectorio, "resultadosDirectorio");

    document.addEventListener("click", (evento) => {
        [["consultaRapidaInput", "consultaRapidaPanel"], ["directorioInput", "directorioPanel"]].forEach(([inputId, panelId]) => {
            const panel = document.getElementById(panelId);
            const input = document.getElementById(inputId);
            if (!panel.classList.contains("d-none") && !panel.contains(evento.target) && evento.target !== input) {
                panel.classList.add("d-none");
                input.setAttribute("aria-expanded", "false");
            }
        });
    });
});
