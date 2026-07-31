//========================================
// ITDESK - REPORTE: HISTORIAL DE NOTIFICACIONES (reporte-notificaciones.html)
//========================================
// Antes era una de las 8 secciones de reportes.js (Salida 5). GET
// /notificacion (TODAS las notificaciones, no solo "mis") ya existia en el
// backend — Admin/Tecnico la tienen permitida. Se pide /ticket ademas para
// resolver el codigo/estado del ticket vinculado a cada notificacion.

let _notificacionesTodas = [];
let _ticketsPorId = new Map();

async function cargarReporteNotificaciones() {
    try {
        const [notificaciones, tickets] = await Promise.all([
            apiFetch("/notificacion").catch(() => []),
            apiFetch("/ticket")
        ]);

        _notificacionesTodas = notificaciones;
        _ticketsPorId = new Map(tickets.map(t => [t.id_ticket, t]));

        document.getElementById("notificacionesActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · ${notificaciones.length} notificaciones.`;

        poblarFiltroTipoNotificacion();
        wireFiltrosNotificaciones();
        aplicarFiltrosNotificaciones();

    } catch (error) {
        document.getElementById("notificacionesActualizado").textContent = "";
        const alerta = document.getElementById("notificacionesError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

function filtrarNotificacionesReporte() {
    const tipo = document.getElementById("filtroTipoNotificacion").value;
    const desde = document.getElementById("filtroDesdeNotificacion").value;
    const hasta = document.getElementById("filtroHastaNotificacion").value;

    return _notificacionesTodas.filter(n => {
        if (tipo && n.tipo !== tipo) {
            return false;
        }
        if (n.fecha_envio) {
            const fecha = new Date(n.fecha_envio);
            if (desde && fecha < new Date(`${desde}T00:00:00`)) {
                return false;
            }
            if (hasta && fecha > new Date(`${hasta}T23:59:59`)) {
                return false;
            }
        }
        return true;
    });
}

function renderTablaReporteNotificaciones(visibles) {
    const tbody = document.getElementById("tablaReporteNotificaciones");
    if (!tbody) {
        return;
    }
    if (visibles.length === 0) {
        UI.renderEmptyState(tbody, 7, "Ninguna notificación coincide con los filtros seleccionados.", "bi-bell-slash");
        return;
    }
    tbody.innerHTML = visibles.map((n, i) => {
        const ticket = _ticketsPorId.get(n.id_ticket);
        return `
            <tr>
                <td data-label="No.">${i + 1}</td>
                <td data-label="Ticket">${ticket ? `<a href="detalle-ticket.html?id=${n.id_ticket}" class="codigo">${Codigos.ticket(ticket)}</a>` : n.ticket_titulo}</td>
                <td data-label="Destinatario">${n.usuario}</td>
                <td data-label="Tipo">${UI.badgeTipoNotificacion(n.tipo)}</td>
                <td data-label="Estado">${ticket ? UI.badgeEstado(ticket.estado) : "—"}</td>
                <td data-label="Mensaje">${n.mensaje}</td>
                <td data-label="Fecha">${UI.formatearFecha(n.fecha_envio)}</td>
            </tr>
        `;
    }).join("");
}

function renderTotalesNotificaciones(filtrados) {
    const cont = document.getElementById("totalesReporteNotificaciones");
    if (!cont) {
        return;
    }
    const noLeidas = filtrados.filter(n => !n.leida).length;
    cont.innerHTML = `
        <span><strong class="text-body">${filtrados.length}</strong> notificaciones</span>
        <span>${noLeidas} sin leer</span>
    `;
}

function aplicarFiltrosNotificaciones() {
    const filtrados = filtrarNotificacionesReporte();
    renderTotalesNotificaciones(filtrados);
    UI.paginarRender(filtrados, renderTablaReporteNotificaciones, document.getElementById("verMasReporteNotificaciones"), {
        selectorId: "cantidadReporteNotificaciones", clave: "cantidadReporteNotificaciones"
    });
}

function poblarFiltroTipoNotificacion() {
    const sel = document.getElementById("filtroTipoNotificacion");
    if (!sel) {
        return;
    }
    sel.innerHTML = `<option value="">Todos</option>` +
        Object.keys(UI.MAPA_TIPO_NOTIFICACION).map(t => `<option value="${t}">${t}</option>`).join("");
}

function wireFiltrosNotificaciones() {
    ["filtroTipoNotificacion", "filtroDesdeNotificacion", "filtroHastaNotificacion"]
        .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltrosNotificaciones));

    document.getElementById("btnLimpiarFiltrosNotificacion").addEventListener("click", () => {
        document.getElementById("filtroTipoNotificacion").value = "";
        document.getElementById("filtroDesdeNotificacion").value = "";
        document.getElementById("filtroHastaNotificacion").value = "";
        aplicarFiltrosNotificaciones();
    });

    document.getElementById("btnImprimirReporteNotificaciones").addEventListener("click", imprimirReporteNotificaciones);
}

function imprimirReporteNotificaciones() {
    const filtrados = filtrarNotificacionesReporte();

    const selTipo = document.getElementById("filtroTipoNotificacion");
    const desde = document.getElementById("filtroDesdeNotificacion").value;
    const hasta = document.getElementById("filtroHastaNotificacion").value;

    const filas = filtrados.map((n, i) => {
        const ticket = _ticketsPorId.get(n.id_ticket);
        return {
            no: i + 1,
            ticket: ticket ? Codigos.ticket(ticket) : n.ticket_titulo,
            destinatario: n.usuario,
            tipo: n.tipo,
            estado: ticket ? ticket.estado : "—",
            mensaje: n.mensaje,
            fecha: UI.formatearFecha(n.fecha_envio)
        };
    });

    Imprimir.reporteNotificaciones({
        codigo: Codigos.reporte("NOT"),
        periodo: (desde || hasta)
            ? `${desde ? formatearFechaInputCorta(desde) : "inicio"} — ${hasta ? formatearFechaInputCorta(hasta) : "hoy"}`
            : "todo el historial",
        filtroTipo: selTipo.value || "Todos",
        filas,
        ...metaImpresion()
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteNotificaciones);
