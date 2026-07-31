//========================================
// ITDESK - REPORTES (reportes.html)
//========================================
// Todo calculado en vivo con GET /ticket + GET /usuarios (ya disponibles
// para Administrador). No hay endpoint de reportes agregados en la API.

// Estado en memoria del Reporte de Tickets Registrados (Salida 1) — se llena
// una sola vez en cargarReportes() y los filtros solo vuelven a leer/pintar
// sobre esto, sin pedir nada de nuevo a la API.
let _ticketsReporteTodos = [];
let _asignacionPorTicket = {};
let _tecnicosTodos = [];
let _ticketsPorId = new Map();
let _notificacionesTodas = [];
let _clientesTodos = [];
let _encuestaPorTicket = new Map();
let _equiposTodos = [];
let _equipoSeleccionado = null;
let _facturasTodas = [];
let _detalleFacturaPorFactura = new Map();
let _terminoClientesReporte = "";
let _clienteSeleccionado = null;

async function cargarReportes() {
    try {
        const [tickets, usuarios, encuestas, asignaciones, notificaciones, equipos, facturas, detallesFactura] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/usuarios"),
            apiFetch("/encuestas").catch(() => []),
            apiFetch("/asignacion").catch(() => []),
            apiFetch("/notificacion").catch(() => []),
            apiFetch("/equipo").catch(() => []),
            apiFetch("/factura").catch(() => []),
            apiFetch("/detalle-factura").catch(() => [])
        ]);

        const enProceso = tickets.filter(t => t.estado === "En proceso").length;
        const resueltos = tickets.filter(t => t.estado === "Resuelto").length;
        const abiertos = tickets.filter(t => t.estado === "Abierto").length;
        const cerrados = tickets.filter(t => t.estado === "Cerrado").length;
        const clientes = usuarios.filter(u => u.rol === "Cliente").length;
        const tecnicosActivos = usuarios.filter(u => u.rol === "Tecnico" && u.estado === "Activo").length;

        const finalizados = resueltos + cerrados;
        const porcentaje = tickets.length > 0 ? Math.round((finalizados / tickets.length) * 100) : 0;

        const promedioSatisfaccion = encuestas.length > 0
            ? (encuestas.reduce((suma, e) => suma + e.calificacion, 0) / encuestas.length)
            : null;

        document.getElementById("repTotalTickets").textContent = tickets.length;
        document.getElementById("repTicketsProceso").textContent = enProceso;
        document.getElementById("repTicketsResueltos").textContent = resueltos;
        document.getElementById("repClientes").textContent = clientes;
        document.getElementById("repTecnicos").textContent = tecnicosActivos;
        document.getElementById("repAbiertos").textContent = abiertos;
        document.getElementById("repCerrados").textContent = cerrados;
        document.getElementById("repPorcentaje").textContent = `${porcentaje}%`;
        document.getElementById("repEncuestas").textContent = encuestas.length;

        document.getElementById("repSatisfaccion").textContent =
            promedioSatisfaccion !== null ? `${promedioSatisfaccion.toFixed(1)} / 5` : "—";
        document.getElementById("repSatisfaccionSub").textContent =
            encuestas.length > 0 ? `${encuestas.length} encuesta${encuestas.length === 1 ? "" : "s"}` : "Sin encuestas todavía";

        document.getElementById("reportesActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · calculado en vivo sobre ${tickets.length} tickets y ${usuarios.length} usuarios.`;

        renderGraficos(tickets, encuestas);

        _ticketsReporteTodos = tickets;
        _asignacionPorTicket = {};
        asignaciones.filter(a => a.activa).forEach(a => {
            _asignacionPorTicket[a.id_ticket] = a;
        });
        poblarFiltroTecnicosReporte(usuarios);
        wireFiltrosReporteTickets();
        aplicarFiltrosReporteTickets();

        _tecnicosTodos = usuarios.filter(u => u.rol === "Tecnico");
        poblarFiltroTecnicosRendimiento();
        wireFiltrosRendimiento();
        aplicarFiltrosRendimiento();

        _ticketsPorId = new Map(tickets.map(t => [t.id_ticket, t]));
        _notificacionesTodas = notificaciones;
        poblarFiltroTipoNotificacion();
        wireFiltrosNotificaciones();
        aplicarFiltrosNotificaciones();

        _clientesTodos = usuarios.filter(u => u.rol === "Cliente");
        _encuestaPorTicket = new Map(encuestas.map(e => [e.id_ticket, e]));
        poblarFiltrosResueltos();
        wireFiltrosResueltos();
        aplicarFiltrosResueltos();

        _equiposTodos = equipos;
        wireReporteEquipos();
        renderReporteEquipos();

        _facturasTodas = facturas;
        _detalleFacturaPorFactura = new Map();
        detallesFactura.forEach(d => {
            if (!_detalleFacturaPorFactura.has(d.id_factura)) {
                _detalleFacturaPorFactura.set(d.id_factura, []);
            }
            _detalleFacturaPorFactura.get(d.id_factura).push(d);
        });
        poblarFiltroClienteFacturas();
        wireFiltrosFacturas();
        aplicarFiltrosFacturas();

        wireFiltrosClientes();
        aplicarFiltrosClientes();

    } catch (error) {
        document.getElementById("reportesActualizado").textContent = "";
        const alerta = document.getElementById("reportesError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

// Los 3 graficos se calculan sobre los mismos "tickets"/"encuestas" que ya
// trae cargarReportes() — no hay endpoint de reportes agregados, asi que no
// se pide nada nuevo a la API. Los colores se leen una sola vez de los
// custom properties del tema activo al cargar la pagina; si el usuario
// cambia de tema sin recargar, el grafico no se retematiza en caliente
// (limitacion conocida, no resuelta en esta pasada).
function renderGraficos(tickets, encuestas) {
    if (typeof Chart === "undefined") {
        return;
    }

    const estilos = getComputedStyle(document.documentElement);
    const color = (token) => estilos.getPropertyValue(token).trim();
    const texto = color("--ink-700");
    const borde = color("--border");

    Chart.defaults.color = texto;
    Chart.defaults.borderColor = borde;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

    const porEstado = {
        Abierto: tickets.filter(t => t.estado === "Abierto").length,
        "En proceso": tickets.filter(t => t.estado === "En proceso").length,
        Resuelto: tickets.filter(t => t.estado === "Resuelto").length,
        Cerrado: tickets.filter(t => t.estado === "Cerrado").length
    };
    new Chart(document.getElementById("chartEstado"), {
        type: "doughnut",
        data: {
            labels: Object.keys(porEstado),
            datasets: [{
                data: Object.values(porEstado),
                backgroundColor: [color("--danger"), color("--warning"), color("--success"), color("--info")]
            }]
        },
        options: { plugins: { legend: { position: "bottom" } } }
    });

    const categorias = ["Hardware", "Software", "Red", "Otro"];
    new Chart(document.getElementById("chartCategoria"), {
        type: "bar",
        data: {
            labels: categorias,
            datasets: [{
                label: "Tickets",
                data: categorias.map(cat => tickets.filter(t => t.categoria === cat).length),
                backgroundColor: color("--accent-600")
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });

    new Chart(document.getElementById("chartSatisfaccion"), {
        type: "bar",
        data: {
            labels: ["1 ★", "2 ★", "3 ★", "4 ★", "5 ★"],
            datasets: [{
                label: "Encuestas",
                data: [1, 2, 3, 4, 5].map(n => encuestas.filter(e => e.calificacion === n).length),
                backgroundColor: color("--warning")
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}

//========================================
// Reporte de Tickets Registrados (Salida 1)
//========================================
// Todo filtrado en memoria sobre _ticketsReporteTodos/_asignacionPorTicket
// (llenados una vez en cargarReportes) — no hay endpoint de busqueda para
// tickets, asi que no se pide nada nuevo a la API por cada cambio de filtro.

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

let _filtrosReporteTicketsConectados = false;

function wireFiltrosReporteTickets() {
    if (_filtrosReporteTicketsConectados) {
        return;
    }
    _filtrosReporteTicketsConectados = true;

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

// "YYYY-MM-DD" (formato nativo de <input type=date>) a "DD/MM/YYYY" sin pasar
// por new Date(): un date-only string se interpreta en UTC, y formatearlo
// con metodos de horario local puede correr el dia mostrado (Republica
// Dominicana es UTC-4) — esto solo reordena los digitos tal cual los eligio
// el usuario, sin conversion de zona horaria de por medio.
function formatearFechaInputCorta(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
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

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

    Imprimir.reporteTickets({
        codigo: Codigos.reporte("RPT-TCK"),
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
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
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    });
}

//========================================
// Reporte de Rendimiento de Técnicos (Salida 4)
//========================================
// Igual que el reporte de tickets: todo calculado en memoria sobre
// _ticketsReporteTodos/_asignacionPorTicket/_tecnicosTodos, sin pedir nada
// nuevo a la API. "Asignados" usa la asignacion ACTIVA por ticket (el mismo
// criterio que ya usa admin.js/Salida 1) — un ticket reasignado cuenta para
// el tecnico actual, no para quien lo tuvo antes.

// Tickets cuya fecha_apertura cae dentro de [desde, hasta] — mismo filtro de
// periodo que usa filtrarTicketsReporte() en la Salida 1.
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
            <td data-label="T. Prom. (hrs)">${f.tiempoPromHoras !== null ? f.tiempoPromHoras.toFixed(1) : "—"}</td>
            <td data-label="Eficiencia">${f.eficiencia !== null ? f.eficiencia + "%" : "—"}</td>
        </tr>
    `).join("");
}

function renderResumenRendimiento(resumen) {
    const cont = document.getElementById("resumenRendimientoTecnicos");
    if (!cont) {
        return;
    }
    cont.innerHTML = `
        <span>Tiempo promedio global: <strong class="text-body">${resumen.tiempoPromedioGlobal !== null ? resumen.tiempoPromedioGlobal.toFixed(1) + " hrs" : "—"}</strong></span>
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

let _filtrosRendimientoConectados = false;

function wireFiltrosRendimiento() {
    if (_filtrosRendimientoConectados) {
        return;
    }
    _filtrosRendimientoConectados = true;

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

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

    Imprimir.reporteRendimiento({
        codigo: Codigos.reporte("RPT-RND"),
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
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
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    });
}

//========================================
// Historial de Notificaciones (Salida 5)
//========================================
// GET /notificacion (TODAS las notificaciones, no solo "mis") ya existia en
// el backend — Admin/Tecnico la tienen permitida — pero ningun frontend la
// usaba todavia. Es la pieza que cubre "Administrador: supervisar todas las
// notificaciones e incidencias activas" de la Salida 5; la campanita de
// layout.js sigue siendo "mis notificaciones", sin cambios.

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

let _filtrosNotificacionesConectados = false;

function wireFiltrosNotificaciones() {
    if (_filtrosNotificacionesConectados) {
        return;
    }
    _filtrosNotificacionesConectados = true;

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

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

    Imprimir.reporteNotificaciones({
        codigo: Codigos.reporte("NOT"),
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
        periodo: (desde || hasta)
            ? `${desde ? formatearFechaInputCorta(desde) : "inicio"} — ${hasta ? formatearFechaInputCorta(hasta) : "hoy"}`
            : "todo el historial",
        filtroTipo: selTipo.value || "Todos",
        filas,
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    });
}

//========================================
// Reporte de Tickets Resueltos (Salida 6)
//========================================
// Alcance: solo tickets Cerrado — son los unicos con fecha_cierre real, y
// "cierre formal" es justo lo que distingue a este reporte del de
// Rendimiento (Salida 4, que mide velocidad de reparacion via
// fecha_resolucion). Duracion aca es siempre apertura->cierre, a proposito.
// El acceso de Cliente ("verificar el cierre formal de su incidencia") ya
// existe via historial.html — no se duplica aca.

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

let _filtrosResueltosConectados = false;

function wireFiltrosResueltos() {
    if (_filtrosResueltosConectados) {
        return;
    }
    _filtrosResueltosConectados = true;

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

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

    Imprimir.reporteResueltos({
        codigo: Codigos.reporte("RSL"),
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
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
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    });
}

//========================================
// Reporte de Equipos Registrados (Salida 7)
//========================================
// Sin filtro de fechas (el spec solo pide busqueda por codigo/tipo/marca/
// cliente) — se reutiliza el modulo Search ya usado en admin.js/tecnico.js
// en vez de armar un filtro nuevo a mano. Los totales del pie son siempre
// sobre TODOS los equipos, no sobre lo que este filtrado por la busqueda:
// es un inventario, no un recorte del reporte.

const CAMPOS_BUSQUEDA_EQUIPO_REPORTE = [
    e => Codigos.equipo(e),
    "tipo",
    "marca",
    "modelo",
    "cliente"
];

function equiposFiltradosReporte(termino) {
    return Search.filtrar(_equiposTodos, termino, CAMPOS_BUSQUEDA_EQUIPO_REPORTE);
}

function renderTablaReporteEquipos(visibles) {
    const tbody = document.getElementById("tablaReporteEquipos");
    if (!tbody) {
        return;
    }
    if (visibles.length === 0) {
        UI.renderEmptyState(tbody, 8, "Ningún equipo coincide con la búsqueda.", "bi-pc-display");
        return;
    }
    tbody.innerHTML = visibles.map((e, i) => `
        <tr class="reporte-fila-clickeable" role="button" data-id-equipo="${e.id_equipo}">
            <td data-label="No.">${i + 1}</td>
            <td data-label="Código"><span class="codigo">${Codigos.equipo(e)}</span></td>
            <td data-label="Tipo">${e.tipo}</td>
            <td data-label="Marca">${e.marca}</td>
            <td data-label="Modelo">${e.modelo}</td>
            <td data-label="Serial">${e.numero_serie}</td>
            <td data-label="Cliente">${e.cliente}</td>
            <td data-label="Estado">${UI.badgeEstadoEquipo(e.estado)}</td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".reporte-fila-clickeable").forEach(fila => {
        fila.addEventListener("click", () => mostrarDetalleEquipo(Number(fila.dataset.idEquipo)));
    });
}

function mostrarDetalleEquipo(id_equipo) {
    const equipo = _equiposTodos.find(e => e.id_equipo === id_equipo);
    const cont = document.getElementById("detalleEquipoSeleccionado");
    const body = document.getElementById("detalleEquipoSeleccionadoBody");
    if (!equipo || !cont || !body) {
        return;
    }

    _equipoSeleccionado = equipo;

    body.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0"><i class="bi bi-pc-display"></i> Detalle del equipo seleccionado</h6>
            ${UI.badgeEstadoEquipo(equipo.estado)}
        </div>
        <div class="row small">
            <div class="col-md-6"><strong>Código:</strong> <span class="codigo">${Codigos.equipo(equipo)}</span></div>
            <div class="col-md-6"><strong>Cliente:</strong> ${equipo.cliente}</div>
            <div class="col-md-4"><strong>Tipo:</strong> ${equipo.tipo}</div>
            <div class="col-md-4"><strong>Marca:</strong> ${equipo.marca}</div>
            <div class="col-md-4"><strong>Modelo:</strong> ${equipo.modelo}</div>
            <div class="col-md-6"><strong>N° Serie:</strong> ${equipo.numero_serie}</div>
            <div class="col-md-6"><strong>Registrado:</strong> ${UI.formatearFechaCorta(equipo.fecha_registro)}</div>
            <div class="col-12 mt-1"><strong>Observación:</strong> ${equipo.observaciones || "Sin observaciones."}</div>
        </div>
    `;
    cont.classList.remove("d-none");
    cont.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderTotalesEquipos() {
    const cont = document.getElementById("totalesReporteEquipos");
    if (!cont) {
        return;
    }
    const activos = _equiposTodos.filter(e => e.estado === "Activo").length;
    const enReparacion = _equiposTodos.filter(e => e.estado === "En Reparación").length;
    const baja = _equiposTodos.filter(e => e.estado === "Baja").length;
    cont.innerHTML = `
        <span><strong class="text-body">${_equiposTodos.length}</strong> equipos</span>
        <span>${activos} activos</span>
        <span>${enReparacion} en reparación</span>
        <span>${baja} de baja</span>
    `;
}

function renderReporteEquipos(termino = "") {
    const filtrados = equiposFiltradosReporte(termino);
    renderTotalesEquipos();
    UI.paginarRender(filtrados, renderTablaReporteEquipos, document.getElementById("verMasReporteEquipos"), {
        selectorId: "cantidadReporteEquipos", clave: "cantidadReporteEquipos"
    });
    return filtrados.length;
}

function wireReporteEquipos() {
    Search.conectar(document.getElementById("buscarEquiposReporte"), (termino) => {
        return renderReporteEquipos(termino);
    }, "resultadosBusquedaEquiposReporte");

    document.getElementById("btnImprimirReporteEquipos").addEventListener("click", imprimirReporteEquipos);
}

function imprimirReporteEquipos() {
    const termino = document.getElementById("buscarEquiposReporte").value.trim();
    const filtrados = equiposFiltradosReporte(termino);

    const filas = filtrados.map((e, i) => ({
        no: i + 1,
        codigo: Codigos.equipo(e),
        tipo: e.tipo,
        marca: e.marca,
        modelo: e.modelo,
        serial: e.numero_serie,
        cliente: e.cliente,
        estado: e.estado
    }));

    const detalle = _equipoSeleccionado ? {
        codigo: Codigos.equipo(_equipoSeleccionado),
        tipo: _equipoSeleccionado.tipo,
        marca: _equipoSeleccionado.marca,
        modelo: _equipoSeleccionado.modelo,
        serial: _equipoSeleccionado.numero_serie,
        cliente: _equipoSeleccionado.cliente,
        observacion: _equipoSeleccionado.observaciones || "Sin observaciones."
    } : null;

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

    Imprimir.reporteEquipos({
        codigo: Codigos.reporte("EQP"),
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
        periodo: `Generado el ${UI.formatearFechaCorta(new Date())}`,
        busqueda: termino || "Todos los equipos",
        filas,
        detalle,
        resumen: {
            total: _equiposTodos.length,
            activos: _equiposTodos.filter(e => e.estado === "Activo").length,
            enReparacion: _equiposTodos.filter(e => e.estado === "En Reparación").length,
            baja: _equiposTodos.filter(e => e.estado === "Baja").length
        },
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    });
}

//========================================
// Listado de Facturas del Sistema (Salida 8)
//========================================
// factura no tiene id_ticket directo (solo id_cotizacion) — el vinculo real
// vive en detalle_factura, que SI se puede pedir completo de una sola vez
// via GET /detalle-factura (bulk, ya existia en el backend, sin usar por
// ningun frontend hasta ahora). En la practica una factura tiene una sola
// linea (un ticket cotizado y facturado a la vez), pero el esquema permite
// mas de una — de ahi el "+N" si aplica.

function primerTicketDeFactura(factura) {
    const lineas = _detalleFacturaPorFactura.get(factura.id_factura) || [];
    if (lineas.length === 0) {
        return null;
    }
    const ticket = _ticketsPorId.get(lineas[0].id_ticket);
    const codigo = ticket ? Codigos.ticket(ticket) : lineas[0].ticket_titulo;
    return lineas.length > 1 ? `${codigo} (+${lineas.length - 1})` : codigo;
}

function filtrarFacturasReporte() {
    const estado = document.getElementById("filtroEstadoFacturas").value;
    const idCliente = document.getElementById("filtroClienteFacturas").value;
    const desde = document.getElementById("filtroDesdeFacturas").value;
    const hasta = document.getElementById("filtroHastaFacturas").value;

    return _facturasTodas.filter(f => {
        if (estado && f.estado !== estado) {
            return false;
        }
        if (idCliente && String(f.id_usuario) !== idCliente) {
            return false;
        }
        if (f.fecha_emision) {
            const fecha = new Date(f.fecha_emision);
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

function renderTablaReporteFacturas(visibles) {
    const tbody = document.getElementById("tablaReporteFacturas");
    if (!tbody) {
        return;
    }
    if (visibles.length === 0) {
        UI.renderEmptyState(tbody, 7, "Ninguna factura coincide con los filtros seleccionados.", "bi-receipt");
        return;
    }
    tbody.innerHTML = visibles.map((f, i) => `
        <tr>
            <td data-label="No.">${i + 1}</td>
            <td data-label="Factura"><span class="codigo">${Codigos.factura(f)}</span></td>
            <td data-label="Ticket">${primerTicketDeFactura(f) || "—"}</td>
            <td data-label="Cliente">${f.cliente}</td>
            <td data-label="Fecha">${UI.formatearFechaCorta(f.fecha_emision)}</td>
            <td data-label="Monto" class="tabular-nums">RD$ ${Number(f.total).toFixed(2)}</td>
            <td data-label="Estado">${UI.badge(f.estado, UI.MAPA_ESTADO_FACTURA)}</td>
        </tr>
    `).join("");
}

function calcularResumenFacturas(filtradas) {
    const suma = (lista) => lista.reduce((acc, f) => acc + Number(f.total), 0);
    return {
        total: filtradas.length,
        totalFacturado: suma(filtradas),
        cobrado: suma(filtradas.filter(f => f.estado === "Pagada")),
        pendiente: suma(filtradas.filter(f => f.estado === "Pendiente")),
        vencido: suma(filtradas.filter(f => f.estado === "Vencida"))
    };
}

function renderTotalesFacturas(resumen) {
    const cont = document.getElementById("totalesReporteFacturas");
    if (!cont) {
        return;
    }
    const money = (n) => `RD$ ${n.toFixed(2)}`;
    cont.innerHTML = `
        <span><strong class="text-body">${resumen.total}</strong> facturas</span>
        <span>Facturado: ${money(resumen.totalFacturado)}</span>
        <span>Cobrado: ${money(resumen.cobrado)}</span>
        <span>Pendiente: ${money(resumen.pendiente)}</span>
        <span>Vencido: ${money(resumen.vencido)}</span>
    `;
}

function aplicarFiltrosFacturas() {
    const filtradas = filtrarFacturasReporte();
    renderTotalesFacturas(calcularResumenFacturas(filtradas));
    UI.paginarRender(filtradas, renderTablaReporteFacturas, document.getElementById("verMasReporteFacturas"), {
        selectorId: "cantidadReporteFacturas", clave: "cantidadReporteFacturas"
    });
}

function poblarFiltroClienteFacturas() {
    const sel = document.getElementById("filtroClienteFacturas");
    if (!sel) {
        return;
    }
    sel.innerHTML = `<option value="">Todos</option>` +
        _clientesTodos.map(c => `<option value="${c.id_usuario}">${c.nombre} ${c.apellido}</option>`).join("");
}

let _filtrosFacturasConectados = false;

function wireFiltrosFacturas() {
    if (_filtrosFacturasConectados) {
        return;
    }
    _filtrosFacturasConectados = true;

    ["filtroEstadoFacturas", "filtroClienteFacturas", "filtroDesdeFacturas", "filtroHastaFacturas"]
        .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltrosFacturas));

    document.getElementById("btnLimpiarFiltrosFacturas").addEventListener("click", () => {
        document.getElementById("filtroEstadoFacturas").value = "";
        document.getElementById("filtroClienteFacturas").value = "";
        document.getElementById("filtroDesdeFacturas").value = "";
        document.getElementById("filtroHastaFacturas").value = "";
        aplicarFiltrosFacturas();
    });

    document.getElementById("btnImprimirReporteFacturas").addEventListener("click", imprimirReporteFacturas);
}

function imprimirReporteFacturas() {
    const filtradas = filtrarFacturasReporte();
    const resumen = calcularResumenFacturas(filtradas);

    const selEstado = document.getElementById("filtroEstadoFacturas");
    const selCliente = document.getElementById("filtroClienteFacturas");
    const desde = document.getElementById("filtroDesdeFacturas").value;
    const hasta = document.getElementById("filtroHastaFacturas").value;

    const filas = filtradas.map((f, i) => ({
        no: i + 1,
        factura: Codigos.factura(f),
        ticket: primerTicketDeFactura(f) || "—",
        cliente: f.cliente,
        fecha: UI.formatearFechaCorta(f.fecha_emision),
        monto: `RD$ ${Number(f.total).toFixed(2)}`,
        estado: f.estado
    }));

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    const money = (n) => `RD$ ${n.toFixed(2)}`;

    Imprimir.reporteFacturas({
        codigo: Codigos.reporte("RPT-FAC"),
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
        periodo: (desde || hasta)
            ? `${desde ? formatearFechaInputCorta(desde) : "inicio"} — ${hasta ? formatearFechaInputCorta(hasta) : "hoy"}`
            : "todo el historial",
        filtros: {
            estado: selEstado.value || "Todos",
            cliente: selCliente.value ? selCliente.options[selCliente.selectedIndex].text : "Todos"
        },
        filas,
        resumen: {
            totalFacturas: resumen.total,
            totalFacturado: money(resumen.totalFacturado),
            cobrado: money(resumen.cobrado),
            pendiente: money(resumen.pendiente),
            vencido: money(resumen.vencido)
        },
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    });
}

//========================================
// Listado de Clientes del Sistema (Salida 10)
//========================================
// Unica seccion que combina busqueda de texto (Search) + filtros de
// desplegable (estado/fecha) al mismo tiempo — las anteriores usaban un
// patron u otro, esta pide ambos. "Tickets" por cliente se cuenta sobre
// _ticketsReporteTodos, ya cargado — no hace falta pedir nada nuevo.

function ticketsPorCliente(id_usuario) {
    return _ticketsReporteTodos.filter(t => t.id_usuario === id_usuario).length;
}

const CAMPOS_BUSQUEDA_CLIENTE_REPORTE = [
    c => Codigos.cliente(c),
    c => `${c.nombre} ${c.apellido}`,
    "correo"
];

function filtrarClientesReporte() {
    const estado = document.getElementById("filtroEstadoClientes").value;
    const desde = document.getElementById("filtroDesdeClientes").value;
    const hasta = document.getElementById("filtroHastaClientes").value;

    const base = _clientesTodos.filter(c => {
        if (estado && c.estado !== estado) {
            return false;
        }
        if (c.fecha_registro) {
            const fecha = new Date(c.fecha_registro);
            if (desde && fecha < new Date(`${desde}T00:00:00`)) {
                return false;
            }
            if (hasta && fecha > new Date(`${hasta}T23:59:59`)) {
                return false;
            }
        }
        return true;
    });

    return Search.filtrar(base, _terminoClientesReporte, CAMPOS_BUSQUEDA_CLIENTE_REPORTE);
}

function renderTablaReporteClientes(visibles) {
    const tbody = document.getElementById("tablaReporteClientes");
    if (!tbody) {
        return;
    }
    if (visibles.length === 0) {
        UI.renderEmptyState(tbody, 7, "Ningún cliente coincide con los filtros seleccionados.", "bi-people");
        return;
    }
    tbody.innerHTML = visibles.map((c, i) => `
        <tr class="reporte-fila-clickeable" role="button" data-id-usuario="${c.id_usuario}">
            <td data-label="No.">${i + 1}</td>
            <td data-label="Código"><span class="codigo">${Codigos.cliente(c)}</span></td>
            <td data-label="Nombre">${c.nombre} ${c.apellido}</td>
            <td data-label="Correo">${c.correo}</td>
            <td data-label="Teléfono">${c.telefono || "—"}</td>
            <td data-label="Tickets">${ticketsPorCliente(c.id_usuario)}</td>
            <td data-label="Estado">${UI.badgeEstadoUsuario(c.estado)}</td>
        </tr>
    `).join("");

    tbody.querySelectorAll(".reporte-fila-clickeable").forEach(fila => {
        fila.addEventListener("click", () => mostrarDetalleCliente(Number(fila.dataset.idUsuario)));
    });
}

function mostrarDetalleCliente(id_usuario) {
    const cliente = _clientesTodos.find(c => c.id_usuario === id_usuario);
    const cont = document.getElementById("detalleClienteSeleccionado");
    const body = document.getElementById("detalleClienteSeleccionadoBody");
    if (!cliente || !cont || !body) {
        return;
    }

    _clienteSeleccionado = cliente;

    body.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0"><i class="bi bi-person-fill"></i> Detalle del cliente seleccionado</h6>
            ${UI.badgeEstadoUsuario(cliente.estado)}
        </div>
        <div class="row small">
            <div class="col-md-6"><strong>Código:</strong> <span class="codigo">${Codigos.cliente(cliente)}</span></div>
            <div class="col-md-6"><strong>Nombre:</strong> ${cliente.nombre} ${cliente.apellido}</div>
            <div class="col-md-6"><strong>Correo:</strong> ${cliente.correo}</div>
            <div class="col-md-6"><strong>Teléfono:</strong> ${cliente.telefono || "—"}</div>
            <div class="col-md-6"><strong>Dirección:</strong> ${cliente.direccion || "—"}</div>
            <div class="col-md-6"><strong>Fecha Reg.:</strong> ${UI.formatearFechaCorta(cliente.fecha_registro)}</div>
            <div class="col-12 mt-1"><strong>Tickets:</strong> ${ticketsPorCliente(cliente.id_usuario)}</div>
        </div>
    `;
    cont.classList.remove("d-none");
    cont.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderTotalesClientes() {
    const cont = document.getElementById("totalesReporteClientes");
    if (!cont) {
        return;
    }
    const activos = _clientesTodos.filter(c => c.estado === "Activo").length;
    const inactivos = _clientesTodos.filter(c => c.estado === "Inactivo").length;
    cont.innerHTML = `
        <span><strong class="text-body">${_clientesTodos.length}</strong> clientes</span>
        <span>${activos} activos</span>
        <span>${inactivos} inactivos</span>
    `;
}

function aplicarFiltrosClientes() {
    const filtrados = filtrarClientesReporte();
    renderTotalesClientes();
    UI.paginarRender(filtrados, renderTablaReporteClientes, document.getElementById("verMasReporteClientes"), {
        selectorId: "cantidadReporteClientes", clave: "cantidadReporteClientes"
    });
    return filtrados.length;
}

let _filtrosClientesConectados = false;

function wireFiltrosClientes() {
    if (_filtrosClientesConectados) {
        return;
    }
    _filtrosClientesConectados = true;

    ["filtroEstadoClientes", "filtroDesdeClientes", "filtroHastaClientes"]
        .forEach(id => document.getElementById(id).addEventListener("change", aplicarFiltrosClientes));

    Search.conectar(document.getElementById("buscarClientesReporte"), (termino) => {
        _terminoClientesReporte = termino;
        return aplicarFiltrosClientes();
    }, "resultadosBusquedaClientesReporte");

    document.getElementById("btnLimpiarFiltrosClientes").addEventListener("click", () => {
        document.getElementById("filtroEstadoClientes").value = "";
        document.getElementById("filtroDesdeClientes").value = "";
        document.getElementById("filtroHastaClientes").value = "";
        document.getElementById("buscarClientesReporte").value = "";
        _terminoClientesReporte = "";
        aplicarFiltrosClientes();
    });

    document.getElementById("btnImprimirReporteClientes").addEventListener("click", imprimirReporteClientes);
}

function imprimirReporteClientes() {
    const filtrados = filtrarClientesReporte();

    const selEstado = document.getElementById("filtroEstadoClientes");
    const termino = document.getElementById("buscarClientesReporte").value.trim();

    const filas = filtrados.map((c, i) => ({
        no: i + 1,
        codigo: Codigos.cliente(c),
        nombre: `${c.nombre} ${c.apellido}`,
        correo: c.correo,
        telefono: c.telefono || "—",
        tickets: ticketsPorCliente(c.id_usuario),
        estado: c.estado
    }));

    const detalle = _clienteSeleccionado ? {
        codigo: Codigos.cliente(_clienteSeleccionado),
        nombre: `${_clienteSeleccionado.nombre} ${_clienteSeleccionado.apellido}`,
        correo: _clienteSeleccionado.correo,
        telefono: _clienteSeleccionado.telefono || "—",
        direccion: _clienteSeleccionado.direccion || "—",
        fechaRegistro: UI.formatearFechaCorta(_clienteSeleccionado.fecha_registro),
        tickets: ticketsPorCliente(_clienteSeleccionado.id_usuario),
        estado: _clienteSeleccionado.estado
    } : null;

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");

    Imprimir.reporteClientes({
        codigo: Codigos.reporte("RPT-CLI"),
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
        periodo: `Generado el ${UI.formatearFechaCorta(new Date())}`,
        filtros: {
            estado: selEstado.value || "Todos",
            busqueda: termino || "Ninguna"
        },
        filas,
        detalle,
        resumen: {
            total: _clientesTodos.length,
            activos: _clientesTodos.filter(c => c.estado === "Activo").length,
            inactivos: _clientesTodos.filter(c => c.estado === "Inactivo").length
        },
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    });
}

document.addEventListener("DOMContentLoaded", cargarReportes);
