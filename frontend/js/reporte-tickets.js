//========================================
// ITDESK - REPORTE: TICKETS REGISTRADOS (reporte-tickets.html)
//========================================
// Antes era una de las 8 secciones de reportes.js (Salida 1) — separada en
// su propia pagina para no pedir los 8 endpoints de reportes cuando solo
// hace falta ver este. Se pide /usuarios ademas de /ticket+/asignacion
// solo para poblar el filtro de tecnico con TODOS los tecnicos (incluso
// los que no tienen ningun ticket asignado ahora mismo) — no alcanza con
// derivarlos de _asignacionPorTicket. Todo filtrado en memoria sobre estos
// arrays, llenados una sola vez al cargar.

let _ticketsReporteTodos = [];
let _asignacionPorTicket = {};

async function cargarReporteTickets() {
    try {
        const [tickets, usuarios, asignaciones] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/usuarios"),
            apiFetch("/asignacion").catch(() => [])
        ]);

        _ticketsReporteTodos = tickets;
        _asignacionPorTicket = {};
        asignaciones.filter(a => a.activa).forEach(a => {
            _asignacionPorTicket[a.id_ticket] = a;
        });

        document.getElementById("ticketsActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · calculado en vivo sobre ${tickets.length} tickets.`;

        poblarFiltroTecnicosReporte(usuarios);
        wireFiltrosReporteTickets();
        aplicarFiltrosReporteTickets();

    } catch (error) {
        document.getElementById("ticketsActualizado").textContent = "";
        const alerta = document.getElementById("ticketsError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

function filtrarTicketsReporte() {
    const estado = document.getElementById("filtroEstadoReporte").value;
    const prioridad = document.getElementById("filtroPrioridadReporte").value;
    const idTecnico = document.getElementById("filtroTecnicoReporte").value;
    const desde = document.getElementById("filtroDesdeReporte").value;
    const hasta = document.getElementById("filtroHastaReporte").value;

    return _ticketsReporteTodos.filter(t => {
        if (estado && t.estado !== estado) {
            return false;
        }
        if (prioridad && t.prioridad !== prioridad) {
            return false;
        }
        if (idTecnico) {
            const activa = _asignacionPorTicket[t.id_ticket];
            if (!activa || String(activa.id_usuario) !== idTecnico) {
                return false;
            }
        }
        if (t.fecha_apertura) {
            const fecha = new Date(t.fecha_apertura);
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

function calcularTotalesReporte(lista) {
    return {
        total: lista.length,
        abierto: lista.filter(t => t.estado === "Abierto").length,
        enProceso: lista.filter(t => t.estado === "En proceso").length,
        resuelto: lista.filter(t => t.estado === "Resuelto").length,
        cerrado: lista.filter(t => t.estado === "Cerrado").length
    };
}

function renderTotalesBarraReporteTickets(totales) {
    const cont = document.getElementById("totalesReporteTickets");
    if (!cont) {
        return;
    }
    cont.innerHTML = `
        <span><strong class="text-body">${totales.total}</strong> tickets</span>
        <span>${totales.abierto} abiertos</span>
        <span>${totales.enProceso} en proceso</span>
        <span>${totales.resuelto} resueltos</span>
        <span>${totales.cerrado} cerrados</span>
    `;
}

function renderTablaReporteTickets(visibles) {
    const tbody = document.getElementById("tablaReporteTickets");
    if (!tbody) {
        return;
    }
    if (visibles.length === 0) {
        UI.renderEmptyState(tbody, 8, "Ningún ticket coincide con los filtros seleccionados.", "bi-search");
        return;
    }
    tbody.innerHTML = visibles.map((t, i) => {
        const activa = _asignacionPorTicket[t.id_ticket];
        return `
            <tr>
                <td data-label="No.">${i + 1}</td>
                <td data-label="Ticket"><a href="detalle-ticket.html?id=${t.id_ticket}" class="codigo">${Codigos.ticket(t)}</a></td>
                <td data-label="Cliente">${t.cliente}</td>
                <td data-label="Equipo">${t.equipo_tipo} ${t.equipo_marca}</td>
                <td data-label="Serial">${t.equipo_numero_serie || "—"}</td>
                <td data-label="Prioridad">${UI.badgePrioridad(t.prioridad)}</td>
                <td data-label="Estado">${UI.badgeEstado(t.estado)}</td>
                <td data-label="Técnico">${activa ? activa.tecnico : "Sin asignar"}</td>
            </tr>
        `;
    }).join("");
}

function aplicarFiltrosReporteTickets() {
    const filtrados = filtrarTicketsReporte();
    renderTotalesBarraReporteTickets(calcularTotalesReporte(filtrados));
    UI.paginarRender(filtrados, renderTablaReporteTickets, document.getElementById("verMasReporteTickets"), {
        selectorId: "cantidadReporteTickets", clave: "cantidadReporteTickets"
    });
}

function poblarFiltroTecnicosReporte(usuarios) {
    const sel = document.getElementById("filtroTecnicoReporte");
    if (!sel) {
        return;
    }
    const tecnicos = usuarios.filter(u => u.rol === "Tecnico");
    sel.innerHTML = `<option value="">Todos</option>` +
        tecnicos.map(t => `<option value="${t.id_usuario}">${t.nombre} ${t.apellido}</option>`).join("");
}

function wireFiltrosReporteTickets() {
    ["filtroEstadoReporte", "filtroPrioridadReporte", "filtroTecnicoReporte", "filtroDesdeReporte", "filtroHastaReporte"]
        .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltrosReporteTickets));

    document.getElementById("btnLimpiarFiltrosReporte").addEventListener("click", () => {
        document.getElementById("filtroEstadoReporte").value = "";
        document.getElementById("filtroPrioridadReporte").value = "";
        document.getElementById("filtroTecnicoReporte").value = "";
        document.getElementById("filtroDesdeReporte").value = "";
        document.getElementById("filtroHastaReporte").value = "";
        aplicarFiltrosReporteTickets();
    });

    document.getElementById("btnImprimirReporteTickets").addEventListener("click", imprimirReporteTickets);
}

function imprimirReporteTickets() {
    const filtrados = filtrarTicketsReporte();
    const totales = calcularTotalesReporte(filtrados);

    const selEstado = document.getElementById("filtroEstadoReporte");
    const selPrioridad = document.getElementById("filtroPrioridadReporte");
    const selTecnico = document.getElementById("filtroTecnicoReporte");
    const desde = document.getElementById("filtroDesdeReporte").value;
    const hasta = document.getElementById("filtroHastaReporte").value;

    const filas = filtrados.map((t, i) => {
        const activa = _asignacionPorTicket[t.id_ticket];
        return {
            no: i + 1,
            ticketCodigo: Codigos.ticket(t),
            cliente: t.cliente,
            equipo: `${t.equipo_tipo} ${t.equipo_marca}`,
            serial: t.equipo_numero_serie || "—",
            prioridad: t.prioridad,
            estado: t.estado,
            tecnico: activa ? activa.tecnico : "Sin asignar"
        };
    });

    Imprimir.reporteTickets({
        codigo: Codigos.reporte("RPT-TCK"),
        rangoFechas: (desde || hasta)
            ? `${desde ? formatearFechaInputCorta(desde) : "inicio"} — ${hasta ? formatearFechaInputCorta(hasta) : "hoy"}`
            : "Todo el historial",
        filtros: {
            estado: selEstado.value || "Todos",
            prioridad: selPrioridad.value || "Todas",
            tecnico: selTecnico.value ? selTecnico.options[selTecnico.selectedIndex].text : "Todos"
        },
        filas,
        totales,
        ...metaImpresion()
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteTickets);
