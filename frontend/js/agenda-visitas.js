//========================================
// ITDESK - AGENDA DE VISITAS TECNICAS (Recepcion / Administrador)
//========================================
// Calendario propio hecho a mano (mes/semana/dia), sin libreria de
// terceros. Todas las fechas se manejan como strings "YYYY-MM-DD" y
// aritmetica anclada en UTC (Date.UTC + getters UTC) — nunca new Date(iso)
// con getters locales, que corre el dia mostrado segun el huso horario del
// navegador (mismo problema ya documentado para <input type=date> en
// reportes-comun.js).

let visitasAgenda = [];
let vistaAgenda = "mes";
let fechaRefAgenda = hoyISO();

const ESTADOS_TERMINALES_VISITA = ["Finalizada", "Cancelada"];
const ESTADOS_CONFIRMABLES = ["Pendiente", "Reprogramada"];
const ESTADOS_REASIGNABLES = ["Confirmada", "En camino", "En progreso"];

// ---- helpers de fecha (UTC, ver nota de arriba) ----

function pad2(n) { return String(n).padStart(2, "0"); }

function hoyISO() {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}-${pad2(ahora.getDate())}`;
}

function isoAFechaUTC(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function fechaUTCAIso(fecha) {
    return fecha.toISOString().slice(0, 10);
}

function sumarDiasISO(iso, dias) {
    const fecha = isoAFechaUTC(iso);
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    return fechaUTCAIso(fecha);
}

function inicioSemanaISO(iso) {
    const fecha = isoAFechaUTC(iso);
    const diaSemana = fecha.getUTCDay(); // 0 domingo .. 6 sabado
    const offset = diaSemana === 0 ? -6 : 1 - diaSemana; // arranca en lunes
    fecha.setUTCDate(fecha.getUTCDate() + offset);
    return fechaUTCAIso(fecha);
}

function formatearLargo(iso, opciones) {
    return isoAFechaUTC(iso).toLocaleDateString("es-DO", { ...opciones, timeZone: "UTC" });
}

// ---- carga de datos ----

async function cargarAgenda() {
    const contenedor = document.getElementById("agendaCalendario");

    try {
        visitasAgenda = await apiFetch("/visita-tecnica");
        renderVistaActual();
        renderProximas();
    } catch (error) {
        contenedor.innerHTML = `<p class="text-danger p-3">${error.message}</p>`;
    }
}

function visitasDeFecha(iso) {
    return visitasAgenda
        .filter(v => v.fecha_solicitada.slice(0, 10) === iso)
        .sort((a, b) => a.hora_solicitada.localeCompare(b.hora_solicitada));
}

// ---- render: dispatcher + navegacion ----

function renderVistaActual() {
    document.getElementById("btnVistaMes").classList.toggle("active", vistaAgenda === "mes");
    document.getElementById("btnVistaSemana").classList.toggle("active", vistaAgenda === "semana");
    document.getElementById("btnVistaDia").classList.toggle("active", vistaAgenda === "dia");

    if (vistaAgenda === "mes") renderMes();
    else if (vistaAgenda === "semana") renderSemana();
    else renderDia();
}

function cambiarVistaAgenda(vista) {
    vistaAgenda = vista;
    renderVistaActual();
}

function navegarAgenda(direccion) {
    const pasos = { mes: 30, semana: 7, dia: 1 }[vistaAgenda]; // mes: aproximado, se corrige normalizando al dia 1 abajo
    if (vistaAgenda === "mes") {
        const [y, m] = fechaRefAgenda.split("-").map(Number);
        const nuevoMes = new Date(Date.UTC(y, m - 1 + direccion, 1));
        fechaRefAgenda = fechaUTCAIso(nuevoMes);
    } else {
        fechaRefAgenda = sumarDiasISO(fechaRefAgenda, pasos * direccion);
    }
    renderVistaActual();
}

function irAHoyAgenda() {
    fechaRefAgenda = hoyISO();
    renderVistaActual();
}

function irADiaEspecifico(iso) {
    fechaRefAgenda = iso;
    vistaAgenda = "dia";
    renderVistaActual();
}

// ---- vista mes ----

function renderMes() {
    const [anio, mes] = fechaRefAgenda.split("-").map(Number);
    const primerDiaMes = fechaUTCAIso(new Date(Date.UTC(anio, mes - 1, 1)));
    const inicioGrilla = inicioSemanaISO(primerDiaMes);
    const hoy = hoyISO();

    document.getElementById("agendaPeriodoLabel").textContent =
        formatearLargo(primerDiaMes, { month: "long", year: "numeric" });

    const dias = Array.from({ length: 42 }, (_, i) => sumarDiasISO(inicioGrilla, i));

    const celdas = dias.map(iso => {
        const [, mesDelDia] = iso.split("-").map(Number);
        const visitas = visitasDeFecha(iso);
        const visibles = visitas.slice(0, 3);
        const resto = visitas.length - visibles.length;

        return `
            <button type="button" class="agenda-dia-celda ${mesDelDia !== mes ? "fuera-de-mes" : ""} ${iso === hoy ? "es-hoy" : ""}"
                onclick="irADiaEspecifico('${iso}')">
                <span class="agenda-dia-numero">${Number(iso.slice(8, 10))}</span>
                ${visibles.map(v => `
                    <span class="agenda-visita-pill" onclick="event.stopPropagation(); abrirDetalleVisita(${v.id_visita})">
                        <span class="dot" style="background: var(--${UI.MAPA_ESTADO_VISITA[v.estado]?.tono === "neutral" ? "ink-500" : "accent-600"})"></span>
                        ${v.hora_solicitada.slice(0, 5)} ${v.cliente.split(" ")[0]}
                    </span>
                `).join("")}
                ${resto > 0 ? `<span class="agenda-mas-visitas">+${resto} más</span>` : ""}
            </button>
        `;
    }).join("");

    document.getElementById("agendaCalendario").innerHTML = `
        <div class="agenda-mes-header">
            ${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => `<span>${d}</span>`).join("")}
        </div>
        <div class="agenda-mes-grid">${celdas}</div>
    `;
}

// ---- vista semana ----

function renderSemana() {
    const inicio = inicioSemanaISO(fechaRefAgenda);
    const hoy = hoyISO();
    const dias = Array.from({ length: 7 }, (_, i) => sumarDiasISO(inicio, i));

    document.getElementById("agendaPeriodoLabel").textContent =
        `${formatearLargo(dias[0], { day: "2-digit", month: "short" })} – ${formatearLargo(dias[6], { day: "2-digit", month: "short", year: "numeric" })}`;

    const columnas = dias.map(iso => {
        const visitas = visitasDeFecha(iso);
        return `
            <div class="agenda-semana-columna ${iso === hoy ? "es-hoy" : ""}">
                <div class="agenda-semana-columna-header">
                    ${formatearLargo(iso, { weekday: "short" })}<br>${Number(iso.slice(8, 10))}
                </div>
                <div class="d-flex flex-column gap-1">
                    ${visitas.length === 0 ? `<span class="text-muted small text-center">—</span>` : visitas.map(v => `
                        <span class="agenda-visita-pill" onclick="abrirDetalleVisita(${v.id_visita})">
                            <span class="dot" style="background: var(--accent-600)"></span>
                            ${v.hora_solicitada.slice(0, 5)} ${v.cliente.split(" ")[0]}
                        </span>
                    `).join("")}
                </div>
            </div>
        `;
    }).join("");

    document.getElementById("agendaCalendario").innerHTML = `<div class="agenda-semana-grid">${columnas}</div>`;
}

// ---- vista dia ----

function renderDia() {
    document.getElementById("agendaPeriodoLabel").textContent =
        formatearLargo(fechaRefAgenda, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

    const visitas = visitasDeFecha(fechaRefAgenda);

    if (visitas.length === 0) {
        document.getElementById("agendaCalendario").innerHTML =
            `<p class="text-muted text-center py-4 mb-0">No hay visitas programadas este día.</p>`;
        return;
    }

    document.getElementById("agendaCalendario").innerHTML = `
        <div class="agenda-lista-dia">
            ${visitas.map(v => `
                <button type="button" class="agenda-visita-card" onclick="abrirDetalleVisita(${v.id_visita})">
                    <span class="agenda-visita-card-hora">${v.hora_solicitada.slice(0, 5)}</span>
                    <span class="agenda-visita-card-info">
                        <strong>${v.cliente} — ${v.especialidad}</strong>
                        <span>${v.tecnico ? `Técnico: ${v.tecnico}` : "Sin técnico asignado"} · ${v.direccion}</span>
                    </span>
                    ${UI.badgeEstadoVisita(v.estado)}
                </button>
            `).join("")}
        </div>
    `;
}

// ---- proximas visitas ----

function renderProximas() {
    const ahoraISO = hoyISO();
    const proximas = visitasAgenda
        .filter(v => !ESTADOS_TERMINALES_VISITA.includes(v.estado) && v.fecha_solicitada.slice(0, 10) >= ahoraISO)
        .sort((a, b) => (a.fecha_solicitada.slice(0, 10) + a.hora_solicitada).localeCompare(b.fecha_solicitada.slice(0, 10) + b.hora_solicitada))
        .slice(0, 8);

    const contenedor = document.getElementById("agendaProximas");

    if (proximas.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small mb-0">No hay visitas próximas.</p>`;
        return;
    }

    contenedor.innerHTML = proximas.map(v => `
        <button type="button" class="agenda-visita-card mb-2" onclick="abrirDetalleVisita(${v.id_visita})">
            <span class="agenda-visita-card-hora">${UI.formatearFechaSolo(v.fecha_solicitada)}<br>${v.hora_solicitada.slice(0, 5)}</span>
            <span class="agenda-visita-card-info">
                <strong>${v.cliente}</strong>
                <span>${v.especialidad}</span>
            </span>
            ${UI.badgeEstadoVisita(v.estado)}
        </button>
    `).join("");
}

// ---- modal de detalle / acciones ----

async function abrirDetalleVisita(id_visita) {
    const visita = visitasAgenda.find(v => v.id_visita === id_visita);
    if (!visita) return;

    document.getElementById("detalleVisitaInfo").innerHTML = `
        <dl class="row mb-0">
            <dt class="col-4">Cliente</dt><dd class="col-8">${visita.cliente}</dd>
            <dt class="col-4">Servicio</dt><dd class="col-8">${visita.especialidad}</dd>
            <dt class="col-4">Fecha y hora</dt><dd class="col-8">${UI.formatearFechaSolo(visita.fecha_solicitada)} · ${visita.hora_solicitada.slice(0, 5)}</dd>
            <dt class="col-4">Dirección</dt><dd class="col-8">${visita.direccion}</dd>
            <dt class="col-4">Motivo</dt><dd class="col-8">${visita.motivo}</dd>
            <dt class="col-4">Estado</dt><dd class="col-8">${UI.badgeEstadoVisita(visita.estado)}</dd>
            <dt class="col-4">Técnico</dt><dd class="col-8">${visita.tecnico || "Sin asignar"}</dd>
            <dt class="col-4">Ticket</dt><dd class="col-8">${visita.id_ticket ? `#${visita.id_ticket}` : "Todavía no generado"}</dd>
        </dl>
    `;

    const acciones = document.getElementById("detalleVisitaAcciones");

    if (ESTADOS_TERMINALES_VISITA.includes(visita.estado)) {
        acciones.innerHTML = `<p class="text-muted small mb-0">Esta visita ya no admite más cambios.</p>`;
        new bootstrap.Modal(document.getElementById("modalDetalleVisita")).show();
        return;
    }

    acciones.innerHTML = `<div class="skeleton-line"></div>`;
    new bootstrap.Modal(document.getElementById("modalDetalleVisita")).show();

    try {
        const [disponibilidad, equipos] = await Promise.all([
            apiFetch(`/visita-tecnica/disponibilidad?id_especialidad=${visita.id_especialidad}&fecha=${visita.fecha_solicitada.slice(0, 10)}`),
            visita.id_ticket ? Promise.resolve([]) : apiFetch(`/equipo/usuario/${visita.id_usuario}`)
        ]);

        const necesitaConfirmar = ESTADOS_CONFIRMABLES.includes(visita.estado);
        const puedeReasignar = ESTADOS_REASIGNABLES.includes(visita.estado);

        acciones.innerHTML = `
            <hr>
            <h6>Reprogramar</h6>
            <div class="row g-2 mb-3">
                <div class="col-sm-6">
                    <input type="date" class="form-control form-control-sm" id="detalleVisitaFecha" value="${visita.fecha_solicitada.slice(0, 10)}">
                </div>
                <div class="col-sm-4">
                    <input type="time" class="form-control form-control-sm" id="detalleVisitaHora" value="${visita.hora_solicitada.slice(0, 5)}">
                </div>
                <div class="col-sm-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="guardarReprogramacion(${visita.id_visita})">Guardar</button>
                </div>
            </div>

            <h6>Técnico</h6>
            <div class="row g-2 mb-3">
                <div class="col-sm-8">
                    <select class="form-select form-select-sm" id="detalleVisitaTecnico">
                        <option value="">Seleccioná un técnico...</option>
                        ${disponibilidad.map(t => `
                            <option value="${t.id_usuario}" ${visita.tecnico && visita.tecnico === t.nombre ? "selected" : ""}>
                                ${t.nombre}${t.horasOcupadas.length > 0 ? ` (${t.horasOcupadas.length} horario(s) ocupado(s) ese día)` : ""}
                            </option>
                        `).join("")}
                    </select>
                </div>
                <div class="col-sm-4">
                    ${puedeReasignar ? `<button type="button" class="btn btn-outline-secondary btn-sm w-100" onclick="guardarReasignacion(${visita.id_visita})">Reasignar</button>` : ""}
                </div>
            </div>

            ${necesitaConfirmar ? `
                ${!visita.id_ticket ? `
                <h6>Equipo del cliente</h6>
                <select class="form-select form-select-sm mb-2" id="detalleVisitaEquipo">
                    <option value="">Seleccioná un equipo...</option>
                    ${equipos.map(e => `<option value="${e.id_equipo}">${e.tipo} ${e.marca} ${e.modelo} — ${e.numero_serie}</option>`).join("")}
                </select>
                ${equipos.length === 0 ? `<p class="text-warning small">Este cliente no tiene equipos registrados todavía — registrá uno desde Recepción antes de confirmar.</p>` : ""}
                ` : ""}
                <button type="button" class="btn btn-primary btn-sm mb-3" onclick="guardarConfirmacion(${visita.id_visita})">
                    <i class="bi bi-check-lg"></i> Confirmar visita
                </button>
            ` : ""}

            <hr>
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="cancelarVisitaAgenda(${visita.id_visita})">
                <i class="bi bi-x-circle"></i> Cancelar visita
            </button>
        `;

    } catch (error) {
        acciones.innerHTML = `<p class="text-danger small">${error.message}</p>`;
    }
}

async function guardarReprogramacion(id_visita) {
    const fecha_solicitada = document.getElementById("detalleVisitaFecha").value;
    const hora_solicitada = document.getElementById("detalleVisitaHora").value;

    try {
        await apiFetch(`/visita-tecnica/${id_visita}/reprogramar`, {
            method: "PATCH",
            body: JSON.stringify({ fecha_solicitada, hora_solicitada })
        });

        bootstrap.Modal.getInstance(document.getElementById("modalDetalleVisita"))?.hide();
        await cargarAgenda();
        UI.toast("Visita reprogramada.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function guardarReasignacion(id_visita) {
    const id_tecnico = document.getElementById("detalleVisitaTecnico").value;

    if (!id_tecnico) {
        UI.toast("Elegí un técnico primero.", "danger");
        return;
    }

    try {
        await apiFetch(`/visita-tecnica/${id_visita}/asignar`, {
            method: "PATCH",
            body: JSON.stringify({ id_tecnico: Number(id_tecnico) })
        });

        bootstrap.Modal.getInstance(document.getElementById("modalDetalleVisita"))?.hide();
        await cargarAgenda();
        UI.toast("Técnico reasignado.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function guardarConfirmacion(id_visita) {
    const id_tecnico = document.getElementById("detalleVisitaTecnico").value;
    const campoEquipo = document.getElementById("detalleVisitaEquipo");

    if (!id_tecnico) {
        UI.toast("Elegí un técnico primero.", "danger");
        return;
    }

    if (campoEquipo && !campoEquipo.value) {
        UI.toast("Elegí un equipo del cliente primero.", "danger");
        return;
    }

    const datos = { id_tecnico: Number(id_tecnico) };
    if (campoEquipo && campoEquipo.value) {
        datos.id_equipo = Number(campoEquipo.value);
    }

    try {
        await apiFetch(`/visita-tecnica/${id_visita}/confirmar`, {
            method: "PATCH",
            body: JSON.stringify(datos)
        });

        bootstrap.Modal.getInstance(document.getElementById("modalDetalleVisita"))?.hide();
        await cargarAgenda();
        UI.toast("Visita confirmada.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function cancelarVisitaAgenda(id_visita) {
    const motivo = await UI.pedirTexto("¿Por qué se cancela esta visita? (opcional)", {
        titulo: "Cancelar visita técnica"
    });

    if (motivo === null) {
        return;
    }

    try {
        await apiFetch(`/visita-tecnica/${id_visita}/cancelar`, {
            method: "PATCH",
            body: JSON.stringify({ motivo })
        });

        bootstrap.Modal.getInstance(document.getElementById("modalDetalleVisita"))?.hide();
        await cargarAgenda();
        UI.toast("Visita cancelada.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarAgenda();

    document.getElementById("btnVistaMes").addEventListener("click", () => cambiarVistaAgenda("mes"));
    document.getElementById("btnVistaSemana").addEventListener("click", () => cambiarVistaAgenda("semana"));
    document.getElementById("btnVistaDia").addEventListener("click", () => cambiarVistaAgenda("dia"));

    document.getElementById("btnAgendaAnterior").addEventListener("click", () => navegarAgenda(-1));
    document.getElementById("btnAgendaSiguiente").addEventListener("click", () => navegarAgenda(1));
    document.getElementById("btnAgendaHoy").addEventListener("click", irAHoyAgenda);
});
