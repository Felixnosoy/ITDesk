//========================================
// ITDESK - REPORTE: FACTURAS DEL SISTEMA (reporte-facturas.html)
//========================================
// Antes era una de las 8 secciones de reportes.js (Salida 8). factura no
// tiene id_ticket directo (solo id_cotizacion) — el vinculo real vive en
// detalle_factura, que SI se puede pedir completo de una sola vez via GET
// /detalle-factura (bulk, ya existia en el backend). En la practica una
// factura tiene una sola linea (un ticket cotizado y facturado a la vez),
// pero el esquema permite mas de una — de ahi el "+N" si aplica.

let _facturasTodas = [];
let _detalleFacturaPorFactura = new Map();
let _ticketsPorId = new Map();
let _clientesTodos = [];

async function cargarReporteFacturas() {
    try {
        const [facturas, detallesFactura, tickets, usuarios] = await Promise.all([
            apiFetch("/factura").catch(() => []),
            apiFetch("/detalle-factura").catch(() => []),
            apiFetch("/ticket"),
            apiFetch("/usuarios")
        ]);

        _facturasTodas = facturas;
        _detalleFacturaPorFactura = new Map();
        detallesFactura.forEach(d => {
            if (!_detalleFacturaPorFactura.has(d.id_factura)) {
                _detalleFacturaPorFactura.set(d.id_factura, []);
            }
            _detalleFacturaPorFactura.get(d.id_factura).push(d);
        });
        _ticketsPorId = new Map(tickets.map(t => [t.id_ticket, t]));
        _clientesTodos = usuarios.filter(u => u.rol === "Cliente");

        document.getElementById("facturasActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · ${facturas.length} facturas.`;

        poblarFiltroClienteFacturas();
        wireFiltrosFacturas();
        aplicarFiltrosFacturas();

    } catch (error) {
        document.getElementById("facturasActualizado").textContent = "";
        const alerta = document.getElementById("facturasError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

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

function wireFiltrosFacturas() {
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

    const money = (n) => `RD$ ${n.toFixed(2)}`;

    Imprimir.reporteFacturas({
        codigo: Codigos.reporte("RPT-FAC"),
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
        ...metaImpresion()
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteFacturas);
