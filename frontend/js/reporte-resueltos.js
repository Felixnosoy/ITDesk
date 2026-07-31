//========================================
// ITDESK - REPORTE: TICKETS RESUELTOS (reporte-resueltos.html)
//========================================
// Antes era una de las 8 secciones de reportes.js (Salida 6). Alcance:
// solo tickets Cerrado — son los unicos con fecha_cierre real, y "cierre
// formal" es justo lo que distingue a este reporte del de Rendimiento
// (que mide velocidad de reparacion via fecha_resolucion). Duracion aca es
// siempre apertura->cierre, a proposito. El acceso de Cliente ("verificar
// el cierre formal de su incidencia") ya existe via historial.html — no se
// duplica aca.

let _ticketsReporteTodos = [];
let _asignacionPorTicket = {};
let _tecnicosTodos = [];
let _clientesTodos = [];
let _encuestaPorTicket = new Map();

async function cargarReporteResueltos() {
    try {
        const [tickets, usuarios, asignaciones, encuestas] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/usuarios"),
            apiFetch("/asignacion").catch(() => []),
            apiFetch("/encuestas").catch(() => [])
        ]);

        _ticketsReporteTodos = tickets;
        _asignacionPorTicket = {};
        asignaciones.filter(a => a.activa).forEach(a => {
            _asignacionPorTicket[a.id_ticket] = a;
        });
        _tecnicosTodos = usuarios.filter(u => u.rol === "Tecnico");
        _clientesTodos = usuarios.filter(u => u.rol === "Cliente");
        _encuestaPorTicket = new Map(encuestas.map(e => [e.id_ticket, e]));

        document.getElementById("resueltosActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · calculado en vivo sobre ${tickets.length} tickets.`;

        poblarFiltrosResueltos();
        wireFiltrosResueltos();
        aplicarFiltrosResueltos();

    } catch (error) {
        document.getElementById("resueltosActualizado").textContent = "";
        const alerta = document.getElementById("resueltosError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

function ticketsResueltosBase() {
    return _ticketsReporteTodos.filter(t => t.estado === "Cerrado");
}

function duracionHoras(ticket) {
    if (!ticket.fecha_cierre) {
        return null;
    }
    return (new Date(ticket.fecha_cierre) - new Date(ticket.fecha_apertura)) / 3600000;
}

function filtrarTicketsResueltos() {
    const idTecnico = document.getElementById("filtroTecnicoResueltos").value;
    const idCliente = document.getElementById("filtroClienteResueltos").value;
    const calificacion = document.getElementById("filtroCalificacionResueltos").value;
    const desde = document.getElementById("filtroDesdeResueltos").value;
    const hasta = document.getElementById("filtroHastaResueltos").value;

    return ticketsResueltosBase().filter(t => {
        if (idTecnico) {
            const activa = _asignacionPorTicket[t.id_ticket];
            if (!activa || String(activa.id_usuario) !== idTecnico) {
                return false;
            }
        }
        if (idCliente && String(t.id_usuario) !== idCliente) {
            return false;
        }
        if (calificacion) {
            const encuesta = _encuestaPorTicket.get(t.id_ticket);
            if (!encuesta || String(encuesta.calificacion) !== calificacion) {
                return false;
            }
        }
        if (t.fecha_cierre) {
            const fecha = new Date(t.fecha_cierre);
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

function renderTablaReporteResueltos(visibles) {
    const tbody = document.getElementById("tablaReporteResueltos");
    if (!tbody) {
        return;
    }
    if (visibles.length === 0) {
        UI.renderEmptyState(tbody, 7, "Ningún ticket coincide con los filtros seleccionados.", "bi-check-circle");
        return;
    }
    tbody.innerHTML = visibles.map((t, i) => {
        const activa = _asignacionPorTicket[t.id_ticket];
        const horas = duracionHoras(t);
        return `
            <tr>
                <td data-label="No.">${i + 1}</td>
                <td data-label="Ticket"><a href="detalle-ticket.html?id=${t.id_ticket}" class="codigo">${Codigos.ticket(t)}</a></td>
                <td data-label="Cliente">${t.cliente}</td>
                <td data-label="Equipo">${t.equipo_tipo} ${t.equipo_marca}</td>
                <td data-label="Técnico">${activa ? activa.tecnico : "Sin asignar"}</td>
                <td data-label="Fecha cierre">${UI.formatearFechaCorta(t.fecha_cierre)}</td>
                <td data-label="Duración">${horas !== null ? Math.round(horas) + " hrs" : "—"}</td>
            </tr>
        `;
    }).join("");
}

function calcularResumenResueltos(filtrados) {
    const duraciones = filtrados.map(duracionHoras).filter(h => h !== null);
    const calificaciones = filtrados
        .map(t => _encuestaPorTicket.get(t.id_ticket)?.calificacion)
        .filter(c => c !== undefined && c !== null);

    return {
        total: filtrados.length,
        duracionPromedio: duraciones.length ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length : null,
        calificacionPromedio: calificaciones.length ? calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length : null
    };
}

function renderTotalesResueltos(resumen) {
    const cont = document.getElementById("totalesReporteResueltos");
    if (!cont) {
        return;
    }
    cont.innerHTML = `
        <span><strong class="text-body">${resumen.total}</strong> resueltos</span>
        <span>Duración promedio: ${resumen.duracionPromedio !== null ? resumen.duracionPromedio.toFixed(1) + " hrs" : "—"}</span>
        <span>Calificación promedio: ${resumen.calificacionPromedio !== null ? resumen.calificacionPromedio.toFixed(1) + " ★" : "—"}</span>
    `;
}

function aplicarFiltrosResueltos() {
    const filtrados = filtrarTicketsResueltos();
    renderTotalesResueltos(calcularResumenResueltos(filtrados));
    UI.paginarRender(filtrados, renderTablaReporteResueltos, document.getElementById("verMasReporteResueltos"), {
        selectorId: "cantidadReporteResueltos", clave: "cantidadReporteResueltos"
    });
}

function poblarFiltrosResueltos() {
    const selTecnico = document.getElementById("filtroTecnicoResueltos");
    if (selTecnico) {
        selTecnico.innerHTML = `<option value="">Todos</option>` +
            _tecnicosTodos.map(t => `<option value="${t.id_usuario}">${t.nombre} ${t.apellido}</option>`).join("");
    }
    const selCliente = document.getElementById("filtroClienteResueltos");
    if (selCliente) {
        selCliente.innerHTML = `<option value="">Todos</option>` +
            _clientesTodos.map(c => `<option value="${c.id_usuario}">${c.nombre} ${c.apellido}</option>`).join("");
    }
}

function wireFiltrosResueltos() {
    ["filtroTecnicoResueltos", "filtroClienteResueltos", "filtroCalificacionResueltos", "filtroDesdeResueltos", "filtroHastaResueltos"]
        .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltrosResueltos));

    document.getElementById("btnLimpiarFiltrosResueltos").addEventListener("click", () => {
        document.getElementById("filtroTecnicoResueltos").value = "";
        document.getElementById("filtroClienteResueltos").value = "";
        document.getElementById("filtroCalificacionResueltos").value = "";
        document.getElementById("filtroDesdeResueltos").value = "";
        document.getElementById("filtroHastaResueltos").value = "";
        aplicarFiltrosResueltos();
    });

    document.getElementById("btnImprimirReporteResueltos").addEventListener("click", imprimirReporteResueltos);
}

function imprimirReporteResueltos() {
    const filtrados = filtrarTicketsResueltos();
    const resumen = calcularResumenResueltos(filtrados);

    const selTecnico = document.getElementById("filtroTecnicoResueltos");
    const selCliente = document.getElementById("filtroClienteResueltos");
    const selCalificacion = document.getElementById("filtroCalificacionResueltos");
    const desde = document.getElementById("filtroDesdeResueltos").value;
    const hasta = document.getElementById("filtroHastaResueltos").value;

    const filas = filtrados.map((t, i) => {
        const activa = _asignacionPorTicket[t.id_ticket];
        const horas = duracionHoras(t);
        return {
            no: i + 1,
            ticket: Codigos.ticket(t),
            cliente: t.cliente,
            equipo: `${t.equipo_tipo} ${t.equipo_marca}`,
            tecnico: activa ? activa.tecnico : "Sin asignar",
            fechaCierre: UI.formatearFechaCorta(t.fecha_cierre),
            duracion: horas !== null ? `${Math.round(horas)} hrs` : "—"
        };
    });

    Imprimir.reporteResueltos({
        codigo: Codigos.reporte("RSL"),
        periodo: (desde || hasta)
            ? `${desde ? formatearFechaInputCorta(desde) : "inicio"} — ${hasta ? formatearFechaInputCorta(hasta) : "hoy"}`
            : "todo el historial",
        filtros: {
            tecnico: selTecnico.value ? selTecnico.options[selTecnico.selectedIndex].text : "Todos",
            cliente: selCliente.value ? selCliente.options[selCliente.selectedIndex].text : "Todos",
            calificacion: selCalificacion.value ? `${selCalificacion.value} ★` : "Todas"
        },
        filas,
        resumen: {
            totalResueltos: resumen.total,
            duracionPromedio: resumen.duracionPromedio !== null ? `${resumen.duracionPromedio.toFixed(1)} hrs` : "—",
            calificacionPromedio: resumen.calificacionPromedio !== null ? `${resumen.calificacionPromedio.toFixed(1)} ★` : "—"
        },
        ...metaImpresion()
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteResueltos);
