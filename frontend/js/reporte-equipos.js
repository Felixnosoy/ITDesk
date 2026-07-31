//========================================
// ITDESK - REPORTE: EQUIPOS REGISTRADOS (reporte-equipos.html)
//========================================
// Antes era una de las 8 secciones de reportes.js (Salida 7). Unica
// seccion 100% aislada del resto — solo GET /equipo, sin cruzar con
// tickets/usuarios. Sin filtro de fechas (el spec solo pide busqueda por
// codigo/tipo/marca/cliente) — se reutiliza el modulo Search ya usado en
// admin.js/tecnico.js en vez de armar un filtro nuevo a mano. Los totales
// del pie son siempre sobre TODOS los equipos, no sobre lo que este
// filtrado por la busqueda: es un inventario, no un recorte del reporte.

let _equiposTodos = [];
let _equipoSeleccionado = null;

async function cargarReporteEquipos() {
    try {
        const equipos = await apiFetch("/equipo");
        _equiposTodos = equipos;

        document.getElementById("equiposActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · ${equipos.length} equipos registrados.`;

        wireReporteEquipos();
        renderReporteEquipos();

    } catch (error) {
        document.getElementById("equiposActualizado").textContent = "";
        const alerta = document.getElementById("equiposError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

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

    Imprimir.reporteEquipos({
        codigo: Codigos.reporte("EQP"),
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
        ...metaImpresion()
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteEquipos);
