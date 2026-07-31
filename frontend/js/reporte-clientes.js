//========================================
// ITDESK - REPORTE: CLIENTES DEL SISTEMA (reporte-clientes.html)
//========================================
// Antes era una de las 8 secciones de reportes.js (Salida 10). Unica
// seccion que combina busqueda de texto (Search) + filtros de desplegable
// (estado/fecha) al mismo tiempo. "Tickets" por cliente se cuenta sobre
// /ticket, pedido aparte solo para eso.

let _clientesTodos = [];
let _ticketsReporteTodos = [];
let _terminoClientesReporte = "";
let _clienteSeleccionado = null;

async function cargarReporteClientes() {
    try {
        const [usuarios, tickets] = await Promise.all([
            apiFetch("/usuarios"),
            apiFetch("/ticket")
        ]);

        _clientesTodos = usuarios.filter(u => u.rol === "Cliente");
        _ticketsReporteTodos = tickets;

        document.getElementById("clientesActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · ${_clientesTodos.length} clientes.`;

        wireFiltrosClientes();
        aplicarFiltrosClientes();

    } catch (error) {
        document.getElementById("clientesActualizado").textContent = "";
        const alerta = document.getElementById("clientesError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

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

function wireFiltrosClientes() {
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

    Imprimir.reporteClientes({
        codigo: Codigos.reporte("RPT-CLI"),
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
        ...metaImpresion()
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteClientes);
