//========================================
// ITDESK - IMPRIMIR (factura / cotización)
//========================================
// No genera ningún PDF en el servidor ni agrega ninguna librería nueva: arma
// el documento dentro de #areaImprimir (oculto en pantalla, visible solo al
// imprimir vía la regla @media print de style.css) y dispara window.print().
// "Guardar como PDF" en el diálogo de impresión del navegador es el export
// real. Los datos ya vienen resueltos por quien llama (documentos.js /
// ticket-tecnico.js) — este helper solo renderiza y dispara la impresión.

const Imprimir = {

    documento({
        tipoDocumento, numero, fecha, estado, ticketCodigo,
        clienteNombre, clienteCodigo, clienteCorreo,
        lineas, subtotal, itbis, descuentoTotal, total,
        tecnico, observaciones
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasLineas = (lineas || []).map(l => `
            <tr>
                <td>${l.ticket_titulo || ""}</td>
                <td>${l.descripcion_servicio || ""}</td>
                <td class="text-end">RD$ ${Number(l.mano_obra || 0).toFixed(2)}</td>
                <td class="text-end">RD$ ${Number(l.repuestos || 0).toFixed(2)}</td>
                <td class="text-end">RD$ ${Number(l.descuento || 0).toFixed(2)}</td>
            </tr>
        `).join("") || `<tr><td colspan="5">Sin líneas de detalle.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">ITDESK</div>
                    <div class="doc-subtitulo">Sistema de Gestión de Soporte Técnico</div>
                    <div class="doc-tipo">${tipoDocumento}</div>
                </div>

                <div class="doc-meta">
                    <div><strong>${tipoDocumento === "FACTURA" ? "Factura No." : "Cotización No."}:</strong> ${numero}</div>
                    <div><strong>Fecha:</strong> ${fecha}</div>
                    ${ticketCodigo ? `<div><strong>Ticket:</strong> ${ticketCodigo}</div>` : ""}
                    <div><strong>Estado:</strong> ${estado}</div>
                </div>

                <div class="doc-seccion">
                    <div class="doc-seccion-titulo">Datos del cliente</div>
                    <div><strong>Nombre:</strong> ${clienteNombre}</div>
                    <div><strong>Código:</strong> ${clienteCodigo}</div>
                    ${clienteCorreo ? `<div><strong>Correo:</strong> ${clienteCorreo}</div>` : ""}
                </div>

                <div class="doc-seccion">
                    <div class="doc-seccion-titulo">Detalle de servicios</div>
                    <table class="doc-tabla">
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

                <div class="doc-totales">
                    <div><span>Subtotal</span><span>RD$ ${Number(subtotal || 0).toFixed(2)}</span></div>
                    <div><span>ITBIS</span><span>RD$ ${Number(itbis || 0).toFixed(2)}</span></div>
                    ${Number(descuentoTotal) > 0 ? `<div><span>Descuento</span><span>-RD$ ${Number(descuentoTotal).toFixed(2)}</span></div>` : ""}
                    <div class="doc-total-final"><span>TOTAL${tipoDocumento === "FACTURA" ? " A PAGAR" : ""}</span><span>RD$ ${Number(total || 0).toFixed(2)}</span></div>
                </div>

                ${(tecnico || observaciones) ? `
                    <div class="doc-footer">
                        ${tecnico ? `<div><strong>Técnico:</strong> ${tecnico}</div>` : ""}
                        ${observaciones ? `<div><strong>Notas:</strong> ${observaciones}</div>` : ""}
                    </div>
                ` : ""}
            </div>
        `;

        window.print();
    }
};
