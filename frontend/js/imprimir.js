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
    },

    // Reporte tabular (listado de tickets con filtros) — a diferencia de
    // documento(), que es un comprobante de una sola entidad, esta vista
    // imprime muchas filas a la vez y no tiene "Página: X/Y" real: el
    // navegador pagina la impresión solo, así que en vez de inventar un
    // conteo de páginas se muestra la cantidad de registros del reporte.
    reporteTickets({
        codigo, generadoPor, rangoFechas, filtros,
        filas, totales, generadoFecha, generadoHora
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasTabla = (filas || []).map(f => `
            <tr>
                <td>${f.no}</td>
                <td>${f.ticketCodigo}</td>
                <td>${f.cliente}</td>
                <td>${f.equipo}</td>
                <td>${f.serial}</td>
                <td>${f.prioridad}</td>
                <td>${f.estado}</td>
                <td>${f.tecnico}</td>
            </tr>
        `).join("") || `<tr><td colspan="8">Ningún ticket coincide con los filtros seleccionados.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">IT DESK</div>
                    <div class="doc-tipo">Reporte de Tickets Registrados</div>
                    <div class="doc-rango-fechas">${rangoFechas}</div>
                </div>

                <div class="doc-meta-cols">
                    <div class="doc-meta-col">
                        <div class="doc-seccion-titulo">Filtros</div>
                        <div><strong>Estado:</strong> ${filtros.estado}</div>
                        <div><strong>Prioridad:</strong> ${filtros.prioridad}</div>
                        <div><strong>Técnico:</strong> ${filtros.tecnico}</div>
                    </div>
                    <div class="doc-meta-col doc-meta-col-right">
                        <div><strong>Usuario:</strong> ${generadoPor}</div>
                        <div><strong>Reporte:</strong> ${codigo}</div>
                        <div><strong>Registros:</strong> ${(filas || []).length}</div>
                    </div>
                </div>

                <table class="doc-tabla">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Ticket</th>
                            <th>Cliente</th>
                            <th>Equipo</th>
                            <th>Serial</th>
                            <th>Prioridad</th>
                            <th>Estado</th>
                            <th>Técnico</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>

                <div class="doc-totales-linea">
                    Total de tickets: ${totales.total} | Abiertos: ${totales.abierto} | En proceso: ${totales.enProceso} | Resueltos: ${totales.resuelto} | Cerrados: ${totales.cerrado}
                </div>

                <div class="doc-footer doc-generado">
                    <div><strong>Fecha de generación:</strong> ${generadoFecha}</div>
                    <div><strong>Hora:</strong> ${generadoHora}</div>
                </div>
            </div>
        `;

        window.print();
    },

    // Reporte de Rendimiento de Tecnicos: una fila por tecnico en vez de una
    // fila por ticket, mas un resumen global y el tecnico destacado del
    // periodo. Misma mecanica que reporteTickets() (rellena #areaImprimir y
    // dispara window.print()).
    reporteRendimiento({
        codigo, generadoPor, periodo, filtroTecnico,
        tecnicoDestacado, filas, resumen, generadoFecha, generadoHora
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasTabla = (filas || []).map(f => `
            <tr>
                <td>${f.no}</td>
                <td>${f.tecnico}</td>
                <td>${f.asignados}</td>
                <td>${f.resueltos}</td>
                <td>${f.pendientes}</td>
                <td>${f.tiempoProm}</td>
                <td>${f.eficiencia}</td>
            </tr>
        `).join("") || `<tr><td colspan="7">Ningún técnico coincide con los filtros seleccionados.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">IT DESK</div>
                    <div class="doc-tipo">Reporte de Rendimiento de Técnicos</div>
                    <div class="doc-rango-fechas">Al ${periodo}</div>
                </div>

                <div class="doc-meta-cols">
                    <div class="doc-meta-col">
                        <div class="doc-seccion-titulo">Filtro</div>
                        <div><strong>Técnico:</strong> ${filtroTecnico}</div>
                    </div>
                    <div class="doc-meta-col doc-meta-col-right">
                        <div><strong>Usuario:</strong> ${generadoPor}</div>
                        <div><strong>Reporte:</strong> ${codigo}</div>
                        <div><strong>Registros:</strong> ${(filas || []).length}</div>
                    </div>
                </div>

                ${tecnicoDestacado ? `<div class="doc-destacado">★ Técnico más eficiente del período: ${tecnicoDestacado}</div>` : ""}

                <table class="doc-tabla">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Técnico</th>
                            <th>Asignados</th>
                            <th>Resueltos</th>
                            <th>Pendientes</th>
                            <th>T.Prom.(hrs)</th>
                            <th>Eficiencia</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>

                <div class="doc-totales-linea">
                    Tiempo promedio global: ${resumen.tiempoPromedioGlobal} | Total tickets período: ${resumen.totalTicketsPeriodo}
                </div>

                <div class="doc-footer doc-generado">
                    <div><strong>Fecha de generación:</strong> ${generadoFecha}</div>
                    <div><strong>Hora:</strong> ${generadoHora}</div>
                </div>
            </div>
        `;

        window.print();
    },

    // Historial de Notificaciones (Salida 5) — una fila por notificacion.
    // "Registros: N" en vez de "Pagina: X/Y" por la misma razon que en
    // reporteTickets()/reporteRendimiento(): no hay forma de calcular
    // paginas de impresion reales desde JS.
    reporteNotificaciones({
        codigo, generadoPor, periodo, filtroTipo, filas, generadoFecha, generadoHora
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasTabla = (filas || []).map(f => `
            <tr>
                <td>${f.no}</td>
                <td>${f.ticket}</td>
                <td>${f.destinatario}</td>
                <td>${f.tipo}</td>
                <td>${f.estado}</td>
                <td>${f.mensaje}</td>
                <td>${f.fecha}</td>
            </tr>
        `).join("") || `<tr><td colspan="7">Ninguna notificación coincide con los filtros seleccionados.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">IT DESK</div>
                    <div class="doc-tipo">Notificación del Sistema</div>
                    <div class="doc-rango-fechas">Al ${periodo}</div>
                </div>

                <div class="doc-meta-cols">
                    <div class="doc-meta-col">
                        <div class="doc-seccion-titulo">Filtro</div>
                        <div><strong>Tipo:</strong> ${filtroTipo}</div>
                    </div>
                    <div class="doc-meta-col doc-meta-col-right">
                        <div><strong>Usuario:</strong> ${generadoPor}</div>
                        <div><strong>Notificación:</strong> ${codigo}</div>
                        <div><strong>Registros:</strong> ${(filas || []).length}</div>
                    </div>
                </div>

                <table class="doc-tabla">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Ticket</th>
                            <th>Destinatario</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Mensaje del sistema</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>

                <div class="doc-footer doc-generado">
                    <div><strong>Fecha de generación:</strong> ${generadoFecha}</div>
                    <div><strong>Hora:</strong> ${generadoHora}</div>
                </div>
            </div>
        `;

        window.print();
    },

    // Reporte de Tickets Resueltos (Salida 6) — solo tickets Cerrado (son los
    // unicos con fecha_cierre real). Duracion = apertura->cierre, a
    // proposito distinta del "tiempo de resolucion" de reporteRendimiento()
    // (que usa fecha_resolucion): ese mide velocidad tecnica, este mide el
    // ciclo completo hasta el cierre administrativo.
    reporteResueltos({
        codigo, generadoPor, periodo, filtros, filas, resumen, generadoFecha, generadoHora
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasTabla = (filas || []).map(f => `
            <tr>
                <td>${f.no}</td>
                <td>${f.ticket}</td>
                <td>${f.cliente}</td>
                <td>${f.equipo}</td>
                <td>${f.tecnico}</td>
                <td>${f.fechaCierre}</td>
                <td>${f.duracion}</td>
            </tr>
        `).join("") || `<tr><td colspan="7">Ningún ticket coincide con los filtros seleccionados.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">IT DESK</div>
                    <div class="doc-tipo">Reporte de Tickets Resueltos</div>
                    <div class="doc-rango-fechas">Al ${periodo}</div>
                </div>

                <div class="doc-meta-cols">
                    <div class="doc-meta-col">
                        <div class="doc-seccion-titulo">Filtros</div>
                        <div><strong>Técnico:</strong> ${filtros.tecnico}</div>
                        <div><strong>Cliente:</strong> ${filtros.cliente}</div>
                        <div><strong>Calificación:</strong> ${filtros.calificacion}</div>
                    </div>
                    <div class="doc-meta-col doc-meta-col-right">
                        <div><strong>Usuario:</strong> ${generadoPor}</div>
                        <div><strong>Reporte:</strong> ${codigo}</div>
                        <div><strong>Registros:</strong> ${(filas || []).length}</div>
                    </div>
                </div>

                <table class="doc-tabla">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Ticket</th>
                            <th>Cliente</th>
                            <th>Equipo</th>
                            <th>Técnico</th>
                            <th>Fecha cierre</th>
                            <th>Duración</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>

                <div class="doc-totales-linea">
                    Total resueltos: ${resumen.totalResueltos} | Duración promedio: ${resumen.duracionPromedio} | Calificación promedio: ${resumen.calificacionPromedio}
                </div>

                <div class="doc-footer doc-generado">
                    <div><strong>Fecha de generación:</strong> ${generadoFecha}</div>
                    <div><strong>Hora:</strong> ${generadoHora}</div>
                </div>
            </div>
        `;

        window.print();
    },

    // Reporte de Equipos Registrados (Salida 7). "detalle" es el equipo que
    // estaba seleccionado en pantalla al imprimir (o null si no habia
    // ninguno) — el mockup muestra la tabla completa MAS el detalle de un
    // equipo puntual en el mismo documento, asi que se replica esa idea acá.
    reporteEquipos({
        codigo, generadoPor, periodo, busqueda, filas, detalle, resumen, generadoFecha, generadoHora
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasTabla = (filas || []).map(f => `
            <tr>
                <td>${f.no}</td>
                <td>${f.codigo}</td>
                <td>${f.tipo}</td>
                <td>${f.marca}</td>
                <td>${f.modelo}</td>
                <td>${f.serial}</td>
                <td>${f.cliente}</td>
                <td>${f.estado}</td>
            </tr>
        `).join("") || `<tr><td colspan="8">Ningún equipo coincide con la búsqueda.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">IT DESK</div>
                    <div class="doc-tipo">Reporte de Equipos Registrados</div>
                    <div class="doc-rango-fechas">${periodo}</div>
                </div>

                <div class="doc-meta-cols">
                    <div class="doc-meta-col">
                        <div class="doc-seccion-titulo">Búsqueda</div>
                        <div>${busqueda}</div>
                    </div>
                    <div class="doc-meta-col doc-meta-col-right">
                        <div><strong>Usuario:</strong> ${generadoPor}</div>
                        <div><strong>Reporte:</strong> ${codigo}</div>
                        <div><strong>Registros:</strong> ${(filas || []).length}</div>
                    </div>
                </div>

                <table class="doc-tabla">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Código</th>
                            <th>Tipo</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Serial</th>
                            <th>Cliente</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>

                ${detalle ? `
                    <div class="doc-seccion">
                        <div class="doc-seccion-titulo">Detalle del equipo seleccionado</div>
                        <div><strong>Código:</strong> ${detalle.codigo}</div>
                        <div><strong>Tipo:</strong> ${detalle.tipo}</div>
                        <div><strong>Marca:</strong> ${detalle.marca}</div>
                        <div><strong>Modelo:</strong> ${detalle.modelo}</div>
                        <div><strong>N° Serie:</strong> ${detalle.serial}</div>
                        <div><strong>Cliente:</strong> ${detalle.cliente}</div>
                        <div><strong>Observación:</strong> ${detalle.observacion}</div>
                    </div>
                ` : ""}

                <div class="doc-totales-linea">
                    Total equipos: ${resumen.total} | Activos: ${resumen.activos} | En Reparación: ${resumen.enReparacion} | Baja: ${resumen.baja}
                </div>

                <div class="doc-footer doc-generado">
                    <div><strong>Fecha de generación:</strong> ${generadoFecha}</div>
                    <div><strong>Hora:</strong> ${generadoHora}</div>
                </div>
            </div>
        `;

        window.print();
    },

    // Listado de Facturas del Sistema (Salida 8) — "Ticket" es la primera
    // linea de detalle_factura de esa factura (en la practica siempre hay
    // una sola, un ticket cotizado y facturado a la vez, pero el esquema
    // permite mas de una — de ahi el "+N" si aplica, ver reportes.js).
    reporteFacturas({
        codigo, generadoPor, periodo, filtros, filas, resumen, generadoFecha, generadoHora
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasTabla = (filas || []).map(f => `
            <tr>
                <td>${f.no}</td>
                <td>${f.factura}</td>
                <td>${f.ticket}</td>
                <td>${f.cliente}</td>
                <td>${f.fecha}</td>
                <td>${f.monto}</td>
                <td>${f.estado}</td>
            </tr>
        `).join("") || `<tr><td colspan="7">Ninguna factura coincide con los filtros seleccionados.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">IT DESK</div>
                    <div class="doc-tipo">Listado de Facturas del Sistema</div>
                    <div class="doc-rango-fechas">${periodo}</div>
                </div>

                <div class="doc-meta-cols">
                    <div class="doc-meta-col">
                        <div class="doc-seccion-titulo">Filtros</div>
                        <div><strong>Estado:</strong> ${filtros.estado}</div>
                        <div><strong>Cliente:</strong> ${filtros.cliente}</div>
                    </div>
                    <div class="doc-meta-col doc-meta-col-right">
                        <div><strong>Usuario:</strong> ${generadoPor}</div>
                        <div><strong>Reporte:</strong> ${codigo}</div>
                        <div><strong>Registros:</strong> ${(filas || []).length}</div>
                    </div>
                </div>

                <table class="doc-tabla">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Factura</th>
                            <th>Ticket</th>
                            <th>Cliente</th>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>

                <div class="doc-totales-linea">
                    Total facturas: ${resumen.totalFacturas} | Total facturado: ${resumen.totalFacturado} | Cobrado: ${resumen.cobrado} | Pendiente: ${resumen.pendiente} | Vencido: ${resumen.vencido}
                </div>

                <div class="doc-footer doc-generado">
                    <div><strong>Fecha de generación:</strong> ${generadoFecha}</div>
                    <div><strong>Hora:</strong> ${generadoHora}</div>
                </div>
            </div>
        `;

        window.print();
    },

    // Listado de Clientes del Sistema (Salida 10) — mismo patron que
    // reporteEquipos(): tabla completa + detalle de UN cliente seleccionado
    // en el mismo documento, si habia alguno elegido en pantalla al imprimir.
    reporteClientes({
        codigo, generadoPor, periodo, filtros, filas, detalle, resumen, generadoFecha, generadoHora
    }) {
        const area = document.getElementById("areaImprimir");
        if (!area) {
            return;
        }

        const filasTabla = (filas || []).map(f => `
            <tr>
                <td>${f.no}</td>
                <td>${f.codigo}</td>
                <td>${f.nombre}</td>
                <td>${f.correo}</td>
                <td>${f.telefono}</td>
                <td>${f.tickets}</td>
                <td>${f.estado}</td>
            </tr>
        `).join("") || `<tr><td colspan="7">Ningún cliente coincide con los filtros seleccionados.</td></tr>`;

        area.innerHTML = `
            <div class="documento-imprimible">
                <div class="doc-header">
                    <div class="doc-marca">IT DESK</div>
                    <div class="doc-tipo">Listado de Clientes del Sistema</div>
                    <div class="doc-rango-fechas">${periodo}</div>
                </div>

                <div class="doc-meta-cols">
                    <div class="doc-meta-col">
                        <div class="doc-seccion-titulo">Filtros</div>
                        <div><strong>Estado:</strong> ${filtros.estado}</div>
                        <div><strong>Búsqueda:</strong> ${filtros.busqueda}</div>
                    </div>
                    <div class="doc-meta-col doc-meta-col-right">
                        <div><strong>Usuario:</strong> ${generadoPor}</div>
                        <div><strong>Reporte:</strong> ${codigo}</div>
                        <div><strong>Registros:</strong> ${(filas || []).length}</div>
                    </div>
                </div>

                <table class="doc-tabla">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Teléfono</th>
                            <th>Tickets</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>${filasTabla}</tbody>
                </table>

                ${detalle ? `
                    <div class="doc-seccion">
                        <div class="doc-seccion-titulo">Detalle del cliente seleccionado</div>
                        <div><strong>Código:</strong> ${detalle.codigo}</div>
                        <div><strong>Nombre:</strong> ${detalle.nombre}</div>
                        <div><strong>Correo:</strong> ${detalle.correo}</div>
                        <div><strong>Teléfono:</strong> ${detalle.telefono}</div>
                        <div><strong>Dirección:</strong> ${detalle.direccion}</div>
                        <div><strong>Fecha Reg.:</strong> ${detalle.fechaRegistro}</div>
                        <div><strong>Tickets:</strong> ${detalle.tickets} &nbsp; <strong>Estado:</strong> ${detalle.estado}</div>
                    </div>
                ` : ""}

                <div class="doc-totales-linea">
                    Total clientes: ${resumen.total} | Activos: ${resumen.activos} | Inactivos: ${resumen.inactivos}
                </div>

                <div class="doc-footer doc-generado">
                    <div><strong>Fecha de generación:</strong> ${generadoFecha}</div>
                    <div><strong>Hora:</strong> ${generadoHora}</div>
                </div>
            </div>
        `;

        window.print();
    }
};
