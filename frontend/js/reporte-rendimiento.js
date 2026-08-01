//========================================
// ITDESK - REPORTE: RENDIMIENTO DE TECNICOS (reporte-rendimiento.html)
//========================================
// Antes era una de las 8 secciones de reportes.js (Salida 4). "Asignados"
// usa la asignacion ACTIVA por ticket (mismo criterio que admin.js/reporte
// de tickets) — un ticket reasignado cuenta para el tecnico actual, no
// para quien lo tuvo antes.

let _ticketsReporteTodos = [];
let _asignacionPorTicket = {};
let _tecnicosTodos = [];

async function cargarReporteRendimiento() {
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
        _tecnicosTodos = usuarios.filter(u => u.rol === "Tecnico");

        document.getElementById("rendimientoActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · calculado en vivo sobre ${tickets.length} tickets.`;

        poblarFiltroTecnicosRendimiento();
        wireFiltrosRendimiento();
        aplicarFiltrosRendimiento();

    } catch (error) {
        document.getElementById("rendimientoActualizado").textContent = "";
        const alerta = document.getElementById("rendimientoError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

// Tickets cuya fecha_apertura cae dentro de [desde, hasta] — mismo filtro de
// periodo que usa el reporte de Tickets Registrados.
function ticketsEnPeriodoRendimiento(desde, hasta) {
    return _ticketsReporteTodos.filter(t => {
        if (!t.fecha_apertura) {
            return true;
        }
        const fecha = new Date(t.fecha_apertura);
        if (desde && fecha < new Date(`${desde}T00:00:00`)) {
            return false;
        }
        if (hasta && fecha > new Date(`${hasta}T23:59:59`)) {
            return false;
        }
        return true;
    });
}

// Horas entre apertura y fecha_resolucion. null si el ticket todavia no
// tiene fecha_resolucion (nunca llego a Resuelto, o es de antes de que esta
// columna existiera) — se excluye del promedio en vez de contar como 0.
function horasResolucion(ticket) {
    if (!ticket.fecha_resolucion) {
        return null;
    }
    return (new Date(ticket.fecha_resolucion) - new Date(ticket.fecha_apertura)) / 3600000;
}

function calcularRendimientoTecnicos() {
    const idTecnicoFiltro = document.getElementById("filtroTecnicoRendimiento").value;
    const desde = document.getElementById("filtroDesdeRendimiento").value;
    const hasta = document.getElementById("filtroHastaRendimiento").value;

    const ticketsPeriodo = ticketsEnPeriodoRendimiento(desde, hasta);

    const tecnicosBase = idTecnicoFiltro
        ? _tecnicosTodos.filter(t => String(t.id_usuario) === idTecnicoFiltro)
        : _tecnicosTodos;

    const filas = tecnicosBase.map(tec => {
        const ticketsTecnico = ticketsPeriodo.filter(t => {
            const activa = _asignacionPorTicket[t.id_ticket];
            return activa && activa.id_usuario === tec.id_usuario;
        });

        const asignados = ticketsTecnico.length;
        const resueltos = ticketsTecnico.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado").length;
        const pendientes = asignados - resueltos;

        const tiempos = ticketsTecnico.map(horasResolucion).filter(h => h !== null);
        const tiempoPromHoras = tiempos.length
            ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
            : null;

        const eficiencia = asignados > 0 ? Math.round((resueltos / asignados) * 100) : null;

        return {
            id_usuario: tec.id_usuario,
            tecnico: `${tec.nombre} ${tec.apellido}`,
            asignados,
            resueltos,
            pendientes,
            tiempoPromHoras,
            eficiencia
        };
    });

    filas.sort((a, b) => (b.eficiencia ?? -1) - (a.eficiencia ?? -1));

    return { filas, ticketsPeriodo };
}

function calcularResumenRendimiento(ticketsPeriodo) {
    const tiempos = ticketsPeriodo.map(horasResolucion).filter(h => h !== null);
    return {
        tiempoPromedioGlobal: tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null,
        totalTicketsPeriodo: ticketsPeriodo.length
    };
}

function renderTablaRendimiento(filas) {
    const tbody = document.getElementById("tablaRendimientoTecnicos");
    if (!tbody) {
        return;
    }
    if (filas.length === 0) {
        UI.renderEmptyState(tbody, 7, "Ningún técnico coincide con los filtros seleccionados.", "bi-person-workspace");
        return;
    }
    tbody.innerHTML = filas.map((f, i) => `
        <tr>
            <td data-label="No.">${i + 1}</td>
            <td data-label="Técnico">${f.tecnico}</td>
            <td data-label="Asignados">${f.asignados}</td>
            <td data-label="Resueltos">${f.resueltos}</td>
            <td data-label="Pendientes">${f.pendientes}</td>
            <td data-label="T. Prom. (hrs)">${f.tiempoPromHoras !== null ? f.tiempoPromHoras.toFixed(1) : '<span class="valor-vacio">Sin datos aún</span>'}</td>
            <td data-label="Eficiencia">${f.eficiencia !== null ? f.eficiencia + "%" : '<span class="valor-vacio">Sin datos aún</span>'}</td>
        </tr>
    `).join("");
}

function renderResumenRendimiento(resumen) {
    const cont = document.getElementById("resumenRendimientoTecnicos");
    if (!cont) {
        return;
    }
    cont.innerHTML = `
        <span>Tiempo promedio global: <strong class="text-body">${resumen.tiempoPromedioGlobal !== null ? resumen.tiempoPromedioGlobal.toFixed(1) + " hrs" : '<span class="valor-vacio">Sin datos aún</span>'}</strong></span>
        <span>Total tickets período: <strong class="text-body">${resumen.totalTicketsPeriodo}</strong></span>
    `;
}

// Solo tiene sentido "destacar" a alguien cuando hay con quien compararlo.
function tecnicoMasEficiente(filas) {
    const candidatos = filas.filter(f => f.eficiencia !== null);
    if (filas.length < 2 || candidatos.length === 0) {
        return null;
    }
    return candidatos.reduce((mejor, actual) => (actual.eficiencia > mejor.eficiencia ? actual : mejor));
}

function renderTecnicoDestacado(filas) {
    const cont = document.getElementById("tecnicoDestacadoRendimiento");
    if (!cont) {
        return;
    }
    const mejor = tecnicoMasEficiente(filas);
    if (!mejor) {
        cont.classList.add("d-none");
        cont.innerHTML = "";
        return;
    }
    cont.classList.remove("d-none");
    cont.innerHTML = `
        <span class="eyebrow tone-success"><i class="bi bi-trophy-fill"></i> Técnico más eficiente del período</span>
        <div class="fw-semibold">${mejor.tecnico} <span class="text-muted fw-normal">— ${mejor.eficiencia}% de eficiencia</span></div>
    `;
}

function aplicarFiltrosRendimiento() {
    const { filas, ticketsPeriodo } = calcularRendimientoTecnicos();
    renderTablaRendimiento(filas);
    renderResumenRendimiento(calcularResumenRendimiento(ticketsPeriodo));
    renderTecnicoDestacado(filas);
}

function poblarFiltroTecnicosRendimiento() {
    const sel = document.getElementById("filtroTecnicoRendimiento");
    if (!sel) {
        return;
    }
    sel.innerHTML = `<option value="">Todos</option>` +
        _tecnicosTodos.map(t => `<option value="${t.id_usuario}">${t.nombre} ${t.apellido}</option>`).join("");
}

function wireFiltrosRendimiento() {
    ["filtroTecnicoRendimiento", "filtroDesdeRendimiento", "filtroHastaRendimiento"]
        .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltrosRendimiento));

    document.getElementById("btnLimpiarFiltrosRendimiento").addEventListener("click", () => {
        document.getElementById("filtroTecnicoRendimiento").value = "";
        document.getElementById("filtroDesdeRendimiento").value = "";
        document.getElementById("filtroHastaRendimiento").value = "";
        aplicarFiltrosRendimiento();
    });

    document.getElementById("btnImprimirReporteRendimiento").addEventListener("click", imprimirReporteRendimiento);
}

function imprimirReporteRendimiento() {
    const { filas, ticketsPeriodo } = calcularRendimientoTecnicos();
    const resumen = calcularResumenRendimiento(ticketsPeriodo);
    const mejor = tecnicoMasEficiente(filas);

    const selTecnico = document.getElementById("filtroTecnicoRendimiento");
    const desde = document.getElementById("filtroDesdeRendimiento").value;
    const hasta = document.getElementById("filtroHastaRendimiento").value;

    const filasImpresion = filas.map((f, i) => ({
        no: i + 1,
        tecnico: f.tecnico,
        asignados: f.asignados,
        resueltos: f.resueltos,
        pendientes: f.pendientes,
        tiempoProm: f.tiempoPromHoras !== null ? f.tiempoPromHoras.toFixed(1) : "—",
        eficiencia: f.eficiencia !== null ? f.eficiencia + "%" : "—"
    }));

    Imprimir.reporteRendimiento({
        codigo: Codigos.reporte("RPT-RND"),
        periodo: (desde || hasta)
            ? `${desde ? formatearFechaInputCorta(desde) : "inicio"} — ${hasta ? formatearFechaInputCorta(hasta) : "hoy"}`
            : "todo el historial",
        filtroTecnico: selTecnico.value ? selTecnico.options[selTecnico.selectedIndex].text : "Todos",
        tecnicoDestacado: mejor ? `${mejor.tecnico} (${mejor.eficiencia}%)` : null,
        filas: filasImpresion,
        resumen: {
            tiempoPromedioGlobal: resumen.tiempoPromedioGlobal !== null ? `${resumen.tiempoPromedioGlobal.toFixed(1)} horas` : "—",
            totalTicketsPeriodo: resumen.totalTicketsPeriodo
        },
        ...metaImpresion()
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteRendimiento);
