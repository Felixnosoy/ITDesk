//========================================
// ITDESK - MIS DOCUMENTOS (documentos.html, CLIENTE)
//========================================
// Solo lectura: GET /cotizacion/mis(/:id) y GET /factura/mis(/:id), ambos ya
// existentes en la API y nunca antes consumidos por ningun frontend. Sin
// acciones de escritura (aprobar/pagar queda fuera de esta pantalla).

let documentoActual = null;
let tipoDocumentoActual = null;

let cotizacionesCliente = [];
let ordenCotizaciones = { campo: null, direccion: "asc" };
const ORDEN_ESTADO_COTIZACION_TABLA = { Pendiente: 0, Aprobada: 1, Rechazada: 2, Vencida: 3 };
const EXTRACTORES_ORDEN_COTIZACIONES = {
    estado: c => ORDEN_ESTADO_COTIZACION_TABLA[c.estado] ?? 9,
    total: c => Number(c.total)
};

let facturasCliente = [];
let ordenFacturas = { campo: null, direccion: "asc" };
const ORDEN_ESTADO_FACTURA_TABLA = { Pendiente: 0, Vencida: 1, Pagada: 2, Anulada: 3 };
const EXTRACTORES_ORDEN_FACTURAS = {
    estado: f => ORDEN_ESTADO_FACTURA_TABLA[f.estado] ?? 9,
    total: f => Number(f.total)
};

async function cargarCotizaciones() {
    const tabla = document.getElementById("tablaCotizaciones");
    UI.renderSkeleton(tabla, 5);

    try {
        cotizacionesCliente = await apiFetch("/cotizacion/mis");

        if (cotizacionesCliente.length === 0) {
            UI.renderEmptyState(tabla, 5, "Todavía no tienes cotizaciones registradas.", "bi-file-earmark-text");
            return;
        }

        actualizarTablaCotizaciones();

    } catch (error) {
        UI.renderErrorRow(tabla, 5, error.message);
    }
}

function actualizarTablaCotizaciones() {
    const tabla = document.getElementById("tablaCotizaciones");

    const datos = ordenCotizaciones.campo
        ? Ordenar.aplicar(cotizacionesCliente, ordenCotizaciones.campo, ordenCotizaciones.direccion, EXTRACTORES_ORDEN_COTIZACIONES[ordenCotizaciones.campo])
        : cotizacionesCliente;

    UI.paginarRender(datos, (visibles) => {
        tabla.innerHTML = visibles.map(c => `
            <tr>
                <td data-label="N.°">${Codigos.cotizacion(c)}</td>
                <td data-label="Fecha">${UI.formatearFechaCorta(c.fecha_creacion)}</td>
                <td data-label="Estado">${UI.badge(c.estado, UI.MAPA_ESTADO_COTIZACION)}</td>
                <td data-label="Total" class="text-end tabular-nums">RD$ ${Number(c.total).toFixed(2)}</td>
                <td data-label="Detalle">
                    <button class="btn btn-outline-primary btn-sm" onclick="verCotizacion(${c.id_cotizacion})">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `).join("");
    }, document.getElementById("verMasCotizaciones"));
}

async function cargarFacturas() {
    const tabla = document.getElementById("tablaFacturas");
    UI.renderSkeleton(tabla, 5);

    try {
        facturasCliente = await apiFetch("/factura/mis");

        if (facturasCliente.length === 0) {
            UI.renderEmptyState(tabla, 5, "Todavía no tienes facturas registradas.", "bi-receipt");
            return;
        }

        actualizarTablaFacturas();

    } catch (error) {
        UI.renderErrorRow(tabla, 5, error.message);
    }
}

function actualizarTablaFacturas() {
    const tabla = document.getElementById("tablaFacturas");

    const datos = ordenFacturas.campo
        ? Ordenar.aplicar(facturasCliente, ordenFacturas.campo, ordenFacturas.direccion, EXTRACTORES_ORDEN_FACTURAS[ordenFacturas.campo])
        : facturasCliente;

    UI.paginarRender(datos, (visibles) => {
        tabla.innerHTML = visibles.map(f => `
            <tr>
                <td data-label="N.°">${Codigos.factura(f)}</td>
                <td data-label="Fecha">${UI.formatearFechaCorta(f.fecha_emision)}</td>
                <td data-label="Estado">${UI.badge(f.estado, UI.MAPA_ESTADO_FACTURA)}</td>
                <td data-label="Total" class="text-end tabular-nums">RD$ ${Number(f.total).toFixed(2)}</td>
                <td data-label="Detalle">
                    <button class="btn btn-outline-primary btn-sm" onclick="verFactura(${f.id_factura})">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `).join("");
    }, document.getElementById("verMasFacturas"));
}

function renderLineasDocumento(doc, tipo) {
    const lineas = doc.detalle || [];

    const filasLineas = lineas.map(l => `
        <tr>
            <td>${l.ticket_titulo}</td>
            <td>${l.descripcion_servicio}</td>
            <td class="text-end">RD$ ${Number(l.mano_obra).toFixed(2)}</td>
            <td class="text-end">RD$ ${Number(l.repuestos).toFixed(2)}</td>
            <td class="text-end">RD$ ${Number(l.descuento).toFixed(2)}</td>
        </tr>
    `).join("") || `<tr><td colspan="5" class="text-center text-muted py-3">Sin líneas de detalle.</td></tr>`;

    return `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            ${UI.badge(doc.estado, tipo === "cotizacion" ? UI.MAPA_ESTADO_COTIZACION : UI.MAPA_ESTADO_FACTURA)}
            <small class="text-muted">${UI.formatearFecha(doc.fecha_creacion || doc.fecha_emision)}</small>
        </div>
        <div class="table-responsive">
            <table class="table table-sm align-middle">
                <thead>
                    <tr>
                        <th>Ticket</th>
                        <th>Servicio</th>
                        <th class="text-end">Mano de obra</th>
                        <th class="text-end">Repuestos</th>
                        <th class="text-end">Descuento</th>
                    </tr>
                </thead>
                <tbody>${filasLineas}</tbody>
            </table>
        </div>
        <dl class="row mb-0 mt-3 pt-3 border-top">
            <dt class="col-8">Subtotal</dt><dd class="col-4 text-end">RD$ ${Number(doc.subtotal).toFixed(2)}</dd>
            <dt class="col-8">ITBIS</dt><dd class="col-4 text-end">RD$ ${Number(doc.itbis).toFixed(2)}</dd>
            ${doc.descuento_total ? `<dt class="col-8">Descuento</dt><dd class="col-4 text-end">RD$ ${Number(doc.descuento_total).toFixed(2)}</dd>` : ""}
            <dt class="col-8 fw-bold">Total</dt><dd class="col-4 text-end fw-bold">RD$ ${Number(doc.total).toFixed(2)}</dd>
        </dl>
        ${doc.observaciones ? `<p class="text-muted small mt-3 mb-0"><i class="bi bi-chat-left-text"></i> ${doc.observaciones}</p>` : ""}
    `;
}

async function abrirModalDocumento(titulo, cargar) {
    const modalEl = document.getElementById("modalDocumento");
    const modal = new bootstrap.Modal(modalEl);
    const body = document.getElementById("modalDocumentoBody");

    document.getElementById("modalDocumentoTitulo").textContent = titulo;
    body.innerHTML = `<span class="skeleton-line" style="height:60px;"></span>`;
    modal.show();

    try {
        await cargar(body);
    } catch (error) {
        body.innerHTML = `<p class="text-danger mb-0">${error.message}</p>`;
    }
}

function verCotizacion(id) {
    tipoDocumentoActual = "cotizacion";
    abrirModalDocumento(`Cotización #${id}`, async (body) => {
        const doc = await apiFetch(`/cotizacion/mis/${id}`);
        documentoActual = doc;
        body.innerHTML = renderLineasDocumento(doc, "cotizacion");
    });
}

function verFactura(id) {
    tipoDocumentoActual = "factura";
    abrirModalDocumento("Factura", async (body) => {
        const doc = await apiFetch(`/factura/mis/${id}`);
        documentoActual = doc;
        document.getElementById("modalDocumentoTitulo").textContent = Codigos.factura(doc);
        body.innerHTML = renderLineasDocumento(doc, "factura");
    });
}

// El cliente ve solo sus propios documentos, asi que doc.id_usuario es
// siempre su propia cuenta — GET /usuarios/:id ya se puede pedir sobre uno
// mismo (ver project_editar_perfil), de ahi sale el codigo CLI- y el correo.
// No se muestra "Tecnico": ese dato sale de /asignacion, que esta reservado
// a Admin/Tecnico y esta vista es de Cliente.
async function imprimirDocumentoActual() {
    if (!documentoActual) {
        return;
    }

    const boton = document.getElementById("btnImprimirDocumento");

    try {
        await UI.conCargando(boton, "Preparando...", async () => {
            const [cliente, tickets] = await Promise.all([
                apiFetch(`/usuarios/${documentoActual.id_usuario}`).catch(() => null),
                apiFetch("/ticket/mis").catch(() => [])
            ]);

            const primerLinea = (documentoActual.detalle || [])[0];
            const ticket = primerLinea ? tickets.find(t => t.id_ticket === primerLinea.id_ticket) : null;

            Imprimir.documento({
                tipoDocumento: tipoDocumentoActual === "factura" ? "FACTURA" : "COTIZACIÓN",
                numero: tipoDocumentoActual === "factura" ? Codigos.factura(documentoActual) : Codigos.cotizacion(documentoActual),
                fecha: UI.formatearFecha(documentoActual.fecha_creacion || documentoActual.fecha_emision),
                estado: documentoActual.estado,
                ticketCodigo: ticket ? Codigos.ticket(ticket) : null,
                clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : "—",
                clienteCodigo: cliente ? Codigos.cliente(cliente) : "—",
                clienteCorreo: cliente?.correo || null,
                lineas: documentoActual.detalle || [],
                subtotal: documentoActual.subtotal,
                itbis: documentoActual.itbis,
                descuentoTotal: documentoActual.descuento_total,
                total: documentoActual.total,
                tecnico: null,
                observaciones: documentoActual.observaciones
            });
        });
    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCotizaciones();
    cargarFacturas();

    Ordenar.conectar(document.getElementById("tablaCotizaciones")?.closest("table"), (campo, direccion) => {
        ordenCotizaciones = { campo, direccion };
        actualizarTablaCotizaciones();
    });

    Ordenar.conectar(document.getElementById("tablaFacturas")?.closest("table"), (campo, direccion) => {
        ordenFacturas = { campo, direccion };
        actualizarTablaFacturas();
    });
});
