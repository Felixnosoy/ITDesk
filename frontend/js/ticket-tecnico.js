//========================================
// ITDESK - DETALLE DE TICKET (TECNICO / ADMINISTRADOR)
//========================================
// Centro de trabajo del ticket: info de cliente/equipo, PUBLIC LOG
// (actualizacion, lo mismo que ve el cliente), diagnostico, cambio de
// estado/cierre, y PRIVATE LOG (nota_privada, solo Admin/Tecnico). Los
// archivos adjuntos NO tienen pestaña propia: se suben junto con el
// comentario (publico o privado, segun desde que formulario se suban) y se
// muestran colgados de esa entrada puntual, no en una lista aparte.

let ticketActual = null;
let clienteActual = null;
let cotizacionActual = null;
let facturaActual = null;
let lineasCotizacionActual = [];
let lineasFacturaActual = [];
let equipoActual = null;
let diagnosticoActual = null;
let logActual = [];
let notasPrivadasActual = [];
let archivosActual = [];

function idDesdeUrl() {
    return new URLSearchParams(window.location.search).get("id");
}

// Un ITSM real casi nunca recibe "archivos ya descargados a la PC": lo mas
// comun es una captura de pantalla (a veces reenviada desde WhatsApp) que el
// tecnico pega directo con Ctrl+V mientras escribe el comentario. Esto NO
// reemplaza el <input type=file> (sigue sirviendo en celular, donde no hay
// portapapeles de imagen que pegar) — los dos escriben al mismo input, asi
// que el resto del flujo (subirlo con el comentario) no sabe ni le importa
// de donde salio el archivo.
// Se usa desde activarPegarCaptura (closure interna) y tambien despues de un
// submit exitoso, donde form.reset() ya vacio el <input> pero no el preview.
function limpiarAdjuntoPreview(idPreview) {
    const preview = document.getElementById(idPreview);
    if (!preview) {
        return;
    }
    const img = preview.querySelector("img");
    if (img) {
        URL.revokeObjectURL(img.src);
    }
    preview.classList.add("d-none");
    preview.innerHTML = "";
}

function activarPegarCaptura(idTextarea, idInput, idPreview) {
    const textarea = document.getElementById(idTextarea);
    const input = document.getElementById(idInput);
    const preview = document.getElementById(idPreview);

    if (!textarea || !input || !preview) {
        return;
    }

    const mostrarPreview = (archivo) => {
        if (!archivo) {
            limpiarAdjuntoPreview(idPreview);
            return;
        }

        const imgPrevia = preview.querySelector("img");
        if (imgPrevia) {
            URL.revokeObjectURL(imgPrevia.src);
        }

        const esImagen = archivo.type.startsWith("image/");
        preview.classList.remove("d-none");
        preview.innerHTML = `
            ${esImagen
                ? `<img src="${URL.createObjectURL(archivo)}" class="adjunto-preview-img" alt="Vista previa">`
                : `<i class="bi bi-file-earmark-pdf fs-4"></i>`}
            <span class="small">${archivo.name}</span>
            <button type="button" class="btn-close flex-shrink-0" aria-label="Quitar adjunto"></button>
        `;
        preview.querySelector("button").addEventListener("click", () => {
            input.value = "";
            mostrarPreview(null);
        });
    };

    textarea.addEventListener("paste", (evento) => {
        const items = [...(evento.clipboardData?.items || [])];
        const itemImagen = items.find(i => i.type.startsWith("image/"));

        if (!itemImagen) {
            return; // sin imagen en el portapapeles: el paste de texto sigue normal
        }

        evento.preventDefault();

        const archivo = itemImagen.getAsFile();
        // el navegador siempre entrega un nombre generico ("image.png") para
        // una captura pegada — se renombra con la hora para poder distinguir
        // varias capturas subidas en el mismo ticket
        const extension = archivo.type.split("/")[1] || "png";
        const archivoRenombrado = new File([archivo], `captura-${Date.now()}.${extension}`, { type: archivo.type });

        const transferencia = new DataTransfer();
        transferencia.items.add(archivoRenombrado);
        input.files = transferencia.files;

        mostrarPreview(archivoRenombrado);
    });

    input.addEventListener("change", () => mostrarPreview(input.files[0] || null));
}

function mostrarErrorTicket(mensaje) {
    const contenedor = document.getElementById("contenidoTicket");
    contenedor.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-exclamation-triangle"></i>
            <p>${mensaje}</p>
        </div>
    `;
    contenedor.classList.remove("d-none");
    document.getElementById("skeletonTicket").classList.add("d-none");
}

async function initDetalleTicket() {
    const id = idDesdeUrl();

    if (!id) {
        mostrarErrorTicket(`No se especificó ningún ticket. <a href="dashboard-tecnico.html">Volver al panel</a>.`);
        return;
    }

    try {
        ticketActual = await apiFetch(`/ticket/${id}`);
    } catch (error) {
        mostrarErrorTicket(error.message);
        return;
    }

    renderHeader(ticketActual);
    document.getElementById("contenidoTicket").classList.remove("d-none");
    document.getElementById("skeletonTicket").classList.add("d-none");

    // Recordar cual fue el ultimo ticket abierto en esta pestaña, para que
    // el tecnico lo identifique al instante al volver a la cola (no
    // persiste entre sesiones, solo mientras dura la pestaña).
    if (Auth.getRol() === "Tecnico") {
        sessionStorage.setItem("ultimoTicketVisto", id);
    }

    const [cliente, log, diagnosticos, equipo, archivos, notasPrivadas] = await Promise.all([
        apiFetch(`/usuarios/${ticketActual.id_usuario}`).catch(() => null),
        apiFetch(`/actualizacion/ticket/${id}`).catch(() => []),
        apiFetch(`/diagnostico/ticket/${id}`).catch(() => []),
        apiFetch(`/equipo/${ticketActual.id_equipo}`).catch(() => null),
        apiFetch(`/archivos/ticket/${id}`).catch(() => []),
        apiFetch(`/notas/ticket/${id}`).catch(() => [])
    ]);

    archivosActual = archivos;

    renderCliente(cliente);
    renderEquipo(ticketActual, equipo);
    renderPublicLog(log);
    renderNotasPrivadas(notasPrivadas);
    renderDiagnostico(diagnosticos[0] || null);
    renderAcciones(ticketActual);
    renderDocumentosRelacionados(id);

    if (ticketActual.estado === "Cerrado") {
        cargarEncuestaTecnico(id);
    }
}

// La tarjeta queda oculta por defecto (ver detalle-ticket.html) — solo se
// muestra si el ticket esta Cerrado Y el cliente ya califico. Si todavia no
// califico, no tiene sentido mostrar una tarjeta vacia esperando algo que
// el cliente puede no hacer nunca.
async function cargarEncuestaTecnico(id_ticket) {
    try {
        const encuesta = await apiFetch(`/encuestas/ticket/${id_ticket}`);
        if (!encuesta) {
            return;
        }

        const estrellas = [1, 2, 3, 4, 5]
            .map(n => `<i class="bi ${n <= encuesta.calificacion ? "bi-star-fill" : "bi-star"}"></i>`)
            .join("");

        document.getElementById("infoEncuestaTecnico").innerHTML = `
            <div class="estrellas-estaticas mb-2">${estrellas}</div>
            ${encuesta.comentario ? `<p class="text-muted small mb-0">"${encuesta.comentario}"</p>` : `<p class="text-muted small mb-0">Sin comentario.</p>`}
        `;
        document.getElementById("cardEncuestaTecnico").classList.remove("d-none");

    } catch {
        // sin encuesta o sin permiso: la tarjeta se queda oculta, no es un error visible
    }
}

// Cotizacion/factura del ticket, de solo lectura. Las lineas de detalle no
// traen el estado/total del documento padre, asi que si existe linea se pide
// el documento completo con una segunda llamada puntual.
async function renderDocumentosRelacionados(id_ticket) {
    const contenedor = document.getElementById("infoDocumentos");

    const [lineasCotizacion, lineasFactura] = await Promise.all([
        apiFetch(`/detalle-cotizacion/ticket/${id_ticket}`).catch(() => []),
        apiFetch(`/detalle-factura/ticket/${id_ticket}`).catch(() => [])
    ]);

    const [cotizacion, factura] = await Promise.all([
        lineasCotizacion[0] ? apiFetch(`/cotizacion/${lineasCotizacion[0].id_cotizacion}`).catch(() => null) : null,
        lineasFactura[0] ? apiFetch(`/factura/${lineasFactura[0].id_factura}`).catch(() => null) : null
    ]);

    lineasCotizacionActual = lineasCotizacion;
    lineasFacturaActual = lineasFactura;
    cotizacionActual = cotizacion;

    const filas = [];

    if (cotizacion) {
        // Aprobar/rechazar es decision del cliente (ver ticket-cliente.js);
        // el tecnico solo ajusta el descuento mientras esta Pendiente y
        // genera la factura una vez que el cliente la aprueba.
        let acciones = "";
        if (cotizacion.estado === "Pendiente") {
            acciones = `
                <div class="d-flex gap-2 mt-2 flex-wrap align-items-center">
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick="abrirModalDescuento()">
                        <i class="bi bi-percent"></i> Descuento
                    </button>
                    <span class="text-muted small"><i class="bi bi-hourglass-split"></i> Esperando la aprobación del cliente.</span>
                </div>
            `;
        } else if (cotizacion.estado === "Aprobada" && !factura) {
            acciones = `
                <div class="d-flex gap-2 mt-2 flex-wrap">
                    <button class="btn btn-success btn-sm" type="button" onclick="generarFactura()">
                        <i class="bi bi-receipt"></i> Generar factura
                    </button>
                </div>
            `;
        }

        filas.push(`
            <div class="py-2 border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-file-earmark-text"></i> Cotización ${Codigos.cotizacion(cotizacion)}</span>
                    <span class="text-end">${UI.badge(cotizacion.estado, UI.MAPA_ESTADO_COTIZACION)}<br>
                        <small class="text-muted">RD$ ${Number(cotizacion.total).toFixed(2)}</small></span>
                </div>
                ${Number(cotizacion.descuento_total) > 0 ? `<div class="small text-muted mt-1">Descuento: RD$ ${Number(cotizacion.descuento_total).toFixed(2)}</div>` : ""}
                ${acciones}
                <div class="mt-2">
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick="imprimirDocumentoTecnico('cotizacion')">
                        <i class="bi bi-printer"></i> Imprimir
                    </button>
                </div>
            </div>
        `);
    }

    facturaActual = factura;

    if (factura) {
        // Pagada/Anulada quedan bloqueadas del lado del backend (no hay
        // vuelta atras); Pendiente y Vencida todavia pueden cambiar.
        const bloqueada = factura.estado === "Pagada" || factura.estado === "Anulada";
        const acciones = bloqueada ? "" : `
            <div class="d-flex gap-2 mt-2 flex-wrap">
                <button class="btn btn-success btn-sm" type="button" onclick="cambiarEstadoFactura('Pagada')">
                    <i class="bi bi-check-circle-fill"></i> Marcar pagada
                </button>
                <button class="btn btn-outline-secondary btn-sm" type="button" onclick="cambiarEstadoFactura('Vencida')">
                    <i class="bi bi-clock-history"></i> Marcar vencida
                </button>
                <button class="btn btn-outline-danger btn-sm" type="button" onclick="cambiarEstadoFactura('Anulada')">
                    <i class="bi bi-x-circle-fill"></i> Anular
                </button>
            </div>
        `;

        filas.push(`
            <div class="py-2 ${cotizacion ? "" : "border-bottom"}">
                <div class="d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-receipt"></i> ${Codigos.factura(factura)}</span>
                    <span class="text-end">${UI.badge(factura.estado, UI.MAPA_ESTADO_FACTURA)}<br>
                        <small class="text-muted">RD$ ${Number(factura.total).toFixed(2)}</small></span>
                </div>
                ${acciones}
                <div class="mt-2">
                    <button class="btn btn-outline-secondary btn-sm" type="button" onclick="imprimirDocumentoTecnico('factura')">
                        <i class="bi bi-printer"></i> Imprimir
                    </button>
                </div>
            </div>
        `);
    }

    // Se puede (re)cotizar si nunca hubo cotizacion, o si la ultima quedo
    // Rechazada/Vencida — el backend solo bloquea una segunda linea mientras
    // hay una activa (Pendiente o Aprobada).
    const puedeCotizar = ticketActual.estado !== "Cerrado"
        && (!cotizacion || !["Pendiente", "Aprobada"].includes(cotizacion.estado));

    if (puedeCotizar) {
        const tieneDiagnostico = Boolean(diagnosticoActual);

        filas.push(`
            <div class="py-2 ${filas.length > 0 ? "border-top" : ""}">
                <p class="text-muted small mb-2">
                    ${cotizacion
                        ? "La cotización anterior no llegó a facturarse. Se puede cotizar de nuevo."
                        : "Este ticket todavía no tiene cotización ni factura asociada."}
                </p>
                ${tieneDiagnostico
                    ? `
                        <button class="btn btn-success btn-sm" type="button" onclick="abrirModalCotizar()">
                            <i class="bi bi-cash-coin"></i> ${cotizacion ? "Cotizar de nuevo" : "Cotizar reparación"}
                        </button>
                    `
                    : `<p class="text-muted small mb-0"><i class="bi bi-info-circle"></i> Completa el diagnóstico del ticket antes de cotizar.</p>`}
            </div>
        `);
    }

    contenedor.innerHTML = filas.length > 0
        ? filas.join("")
        : `<p class="text-muted small mb-0">Este ticket todavía no tiene cotización ni factura asociada.</p>`;
}

// A diferencia de documentos.js (Cliente), aca si se puede mostrar
// "Tecnico": /asignacion esta reservado a Admin/Tecnico y esta vista es de
// esos roles. Las lineas de detalle ya estan cacheadas desde
// renderDocumentosRelacionados — solo falta pedir la asignacion activa.
async function imprimirDocumentoTecnico(tipo) {
    const doc = tipo === "factura" ? facturaActual : cotizacionActual;
    const lineas = tipo === "factura" ? lineasFacturaActual : lineasCotizacionActual;

    if (!doc) {
        return;
    }

    try {
        const asignaciones = await apiFetch(`/asignacion/ticket/${ticketActual.id_ticket}`).catch(() => []);
        const activa = asignaciones.find(a => a.activa);

        Imprimir.documento({
            tipoDocumento: tipo === "factura" ? "FACTURA" : "COTIZACIÓN",
            numero: tipo === "factura" ? Codigos.factura(doc) : Codigos.cotizacion(doc),
            fecha: UI.formatearFecha(doc.fecha_creacion || doc.fecha_emision),
            estado: doc.estado,
            ticketCodigo: Codigos.ticket(ticketActual),
            clienteNombre: clienteActual ? `${clienteActual.nombre} ${clienteActual.apellido}` : ticketActual.cliente,
            clienteCodigo: clienteActual ? Codigos.cliente(clienteActual) : "—",
            clienteCorreo: clienteActual?.correo || null,
            lineas,
            subtotal: doc.subtotal,
            itbis: doc.itbis,
            descuentoTotal: doc.descuento_total,
            total: doc.total,
            tecnico: activa ? activa.tecnico : null,
            observaciones: doc.observaciones
        });
    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function abrirModalCotizar() {
    document.getElementById("formCotizar").reset();
    const modal = new bootstrap.Modal(document.getElementById("modalCotizar"));
    modal.show();
}

// Una cotizacion es del CLIENTE, no del ticket (el modelo de datos permite
// varios tickets del mismo cliente en un solo presupuesto). Por eso: se
// reutiliza la cotizacion Pendiente del cliente si ya existe una, en vez de
// crear una nueva cada vez — el tecnico no tiene que decidir esto.
async function guardarCotizacion(event) {
    event.preventDefault();

    const datos = {
        descripcion_servicio: document.getElementById("cotDescripcion").value.trim(),
        mano_obra: Number(document.getElementById("cotManoObra").value) || 0,
        repuestos: Number(document.getElementById("cotRepuestos").value) || 0,
        descuento: Number(document.getElementById("cotDescuento").value) || 0
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Guardando...", async () => {
            const cotizacionesCliente = await apiFetch(`/cotizacion/usuario/${ticketActual.id_usuario}`).catch(() => []);
            let cotizacion = cotizacionesCliente.find(c => c.estado === "Pendiente");

            if (!cotizacion) {
                cotizacion = await apiFetch("/cotizacion", {
                    method: "POST",
                    body: JSON.stringify({ id_usuario: ticketActual.id_usuario })
                });
            }

            await apiFetch("/detalle-cotizacion", {
                method: "POST",
                body: JSON.stringify({
                    id_cotizacion: cotizacion.id_cotizacion,
                    id_ticket: ticketActual.id_ticket,
                    ...datos
                })
            });
        });

        bootstrap.Modal.getInstance(document.getElementById("modalCotizar")).hide();
        UI.toast("Cotización guardada correctamente.");
        notificarCliente("Cotización", `Tu ticket ${Codigos.ticket(ticketActual)} tiene una cotización lista para tu aprobación.`);
        await renderDocumentosRelacionados(ticketActual.id_ticket);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function abrirModalDescuento() {
    document.getElementById("descMonto").value = cotizacionActual.descuento_total || 0;
    const modal = new bootstrap.Modal(document.getElementById("modalDescuento"));
    modal.show();
}

// Descuento general de la cotizacion (se aplica sobre el subtotal antes del
// ITBIS) — distinto del descuento por linea que ya se pide al cotizar.
async function guardarDescuento(event) {
    event.preventDefault();

    const descuento_total = Number(document.getElementById("descMonto").value) || 0;
    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Guardando...", () =>
            apiFetch(`/cotizacion/${cotizacionActual.id_cotizacion}/descuento`, {
                method: "PATCH",
                body: JSON.stringify({ descuento_total })
            })
        );

        bootstrap.Modal.getInstance(document.getElementById("modalDescuento")).hide();
        UI.toast("Descuento actualizado.");
        await renderDocumentosRelacionados(ticketActual.id_ticket);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

// Copia (snapshot) los montos ya aprobados de la cotizacion y clona cada
// linea a detalle_factura del lado del backend — el frontend no arma nada
// de eso a mano, solo dispara la accion.
async function generarFactura() {
    const confirmado = await UI.confirmar(
        "¿Generar la factura de esta cotización? Se copiarán los montos aprobados y no se puede deshacer.",
        { titulo: "Generar factura", textoConfirmar: "Sí, generar", claseConfirmar: "btn-success" }
    );

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch("/factura", {
            method: "POST",
            body: JSON.stringify({ id_cotizacion: cotizacionActual.id_cotizacion })
        });
        UI.toast("Factura generada correctamente.");
        await renderDocumentosRelacionados(ticketActual.id_ticket);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

// Pagada y Anulada quedan bloqueadas para siempre del lado del backend
// (no hay vuelta atras); Vencida todavia puede pasar a Pagada o Anulada
// despues, por eso su confirmacion es mas liviana que las otras dos.
const CONFIRMACION_ESTADO_FACTURA = {
    Pagada: { mensaje: "¿Marcar esta factura como pagada? Una vez pagada, no se puede modificar.", clase: "btn-success" },
    Vencida: { mensaje: "¿Marcar esta factura como vencida?", clase: "btn-secondary" },
    Anulada: { mensaje: "¿Anular esta factura? Una vez anulada, no se puede modificar.", clase: "btn-danger" }
};

async function cambiarEstadoFactura(estado) {
    const config = CONFIRMACION_ESTADO_FACTURA[estado];

    const confirmado = await UI.confirmar(config.mensaje, {
        titulo: "Actualizar factura",
        textoConfirmar: "Sí, continuar",
        claseConfirmar: config.clase
    });

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch(`/factura/${facturaActual.id_factura}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado })
        });
        UI.toast("Factura actualizada.");
        await renderDocumentosRelacionados(ticketActual.id_ticket);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

// apiFetch asume respuestas JSON — para un binario se hace un fetch aparte,
// se arma un blob y se dispara la descarga sin navegar a otra pagina.
async function descargarArchivoAdjunto(id_archivo, nombreOriginal) {
    try {
        const respuesta = await fetch(`${API_URL}/archivos/${id_archivo}/descargar`, {
            headers: { Authorization: `Bearer ${Auth.getToken()}` }
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo descargar el archivo.");
        }

        const blob = await respuesta.blob();
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreOriginal;
        enlace.click();
        URL.revokeObjectURL(url);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

// Un archivo ahora siempre cuelga de un comentario (publico o privado), asi
// que borrarlo puede afectar a cualquiera de los dos logs — se refrescan
// ambos con los datos ya cacheados en vez de volver a pedir todo el ticket.
async function eliminarArchivoAdjunto(id_archivo) {
    const confirmado = await UI.confirmar("¿Eliminar este archivo? Esta acción no se puede deshacer.", {
        titulo: "Eliminar archivo",
        textoConfirmar: "Sí, eliminar"
    });

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch(`/archivos/${id_archivo}`, { method: "DELETE" });
        UI.toast("Archivo eliminado.");
        archivosActual = await apiFetch(`/archivos/ticket/${ticketActual.id_ticket}`).catch(() => []);
        renderPublicLog(logActual);
        renderNotasPrivadas(notasPrivadasActual);
    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function renderHeader(ticket) {
    document.getElementById("breadcrumbTicket").textContent = Codigos.ticket(ticket);
    document.getElementById("tituloTicket").textContent = ticket.titulo;
    document.getElementById("badgeEstadoTicket").innerHTML = UI.badgeEstado(ticket.estado);
    document.getElementById("badgePrioridadTicket").innerHTML = UI.badgePrioridad(ticket.prioridad);
    document.getElementById("badgeCategoriaTicket").innerHTML = UI.badgeCategoria(ticket.categoria);
    document.getElementById("fechaAperturaTicket").textContent = UI.formatearFecha(ticket.fecha_apertura);
    document.getElementById("descripcionTicket").textContent = ticket.descripcion;

    if (ticket.fecha_cierre) {
        document.getElementById("fechaCierreWrap").classList.remove("d-none");
        document.getElementById("fechaCierreTicket").textContent = UI.formatearFecha(ticket.fecha_cierre);
    }
}

function renderCliente(cliente) {
    clienteActual = cliente;
    const el = document.getElementById("infoCliente");

    if (!cliente) {
        el.innerHTML = `<p class="text-muted mb-0">No se pudo cargar la información del cliente.</p>`;
        return;
    }

    el.innerHTML = `
        <dl class="row mb-0">
            <dt class="col-5">Código</dt><dd class="col-7">${Codigos.cliente(cliente)}</dd>
            <dt class="col-5">Nombre</dt><dd class="col-7">${cliente.nombre} ${cliente.apellido}</dd>
            <dt class="col-5">Correo</dt><dd class="col-7">${cliente.correo}</dd>
            <dt class="col-5">Teléfono</dt><dd class="col-7">${cliente.telefono || "—"}</dd>
            <dt class="col-5">Dirección</dt><dd class="col-7">${cliente.direccion || "—"}</dd>
        </dl>
    `;
}

function renderEquipo(ticket, equipo) {
    equipoActual = equipo;
    const el = document.getElementById("infoEquipo");

    // equipo_* del ticket vienen de un JOIN en vivo con la tabla equipo, asi
    // que en teoria coinciden con "equipo" — pero se prefiere el objeto
    // equipo cuando esta disponible (ej. recien editado) para no depender
    // de que ticketActual se haya vuelto a pedir.
    const tipo = equipo?.tipo || ticket.equipo_tipo;
    const marca = equipo?.marca || ticket.equipo_marca;
    const modelo = equipo?.modelo || ticket.equipo_modelo;
    const numeroSerie = equipo?.numero_serie || ticket.equipo_numero_serie;

    el.innerHTML = `
        <dl class="row mb-0">
            ${equipo ? `<dt class="col-5">Código</dt><dd class="col-7">${Codigos.equipo(equipo)}</dd>` : ""}
            <dt class="col-5">Tipo</dt><dd class="col-7">${tipo}</dd>
            <dt class="col-5">Marca</dt><dd class="col-7">${marca}</dd>
            <dt class="col-5">Modelo</dt><dd class="col-7">${modelo}</dd>
            <dt class="col-5">N.° de serie</dt><dd class="col-7">${numeroSerie}</dd>
            ${equipo ? `<dt class="col-5">Estado</dt><dd class="col-7">${equipo.estado}</dd>` : ""}
            <dt class="col-5">Observaciones</dt><dd class="col-7">${equipo?.observaciones || "—"}</dd>
        </dl>
        ${equipo ? `
            <button class="btn btn-outline-secondary btn-sm mt-2" type="button" onclick="abrirModalEditarEquipo()">
                <i class="bi bi-pencil"></i> Editar
            </button>
        ` : ""}
    `;
}

function abrirModalEditarEquipo() {
    document.getElementById("eqeTipo").value = equipoActual.tipo;
    document.getElementById("eqeMarca").value = equipoActual.marca;
    document.getElementById("eqeModelo").value = equipoActual.modelo;
    document.getElementById("eqeSerie").value = equipoActual.numero_serie;
    document.getElementById("eqeEstado").value = equipoActual.estado;
    document.getElementById("eqeObservaciones").value = equipoActual.observaciones || "";

    const modal = new bootstrap.Modal(document.getElementById("modalEditarEquipo"));
    modal.show();
}

async function guardarEdicionEquipo(event) {
    event.preventDefault();

    const datos = {
        tipo: document.getElementById("eqeTipo").value,
        marca: document.getElementById("eqeMarca").value.trim(),
        modelo: document.getElementById("eqeModelo").value.trim(),
        numero_serie: document.getElementById("eqeSerie").value.trim(),
        estado: document.getElementById("eqeEstado").value.trim(),
        observaciones: document.getElementById("eqeObservaciones").value.trim()
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        const equipoActualizado = await UI.conCargando(boton, "Guardando...", () =>
            apiFetch(`/equipo/${equipoActual.id_equipo}`, {
                method: "PUT",
                body: JSON.stringify(datos)
            })
        );

        bootstrap.Modal.getInstance(document.getElementById("modalEditarEquipo")).hide();
        UI.toast("Equipo actualizado correctamente.");
        renderEquipo(ticketActual, equipoActualizado);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

// Arma {id_actualizacion: archivo} a partir de archivosActual (ya cacheado
// desde initDetalleTicket/recargarTicket) para que UI.renderTimeline pueda
// mostrar la foto colgada de la entrada exacta a la que se subio.
function archivosPorEntrada(campo) {
    const mapa = {};
    archivosActual.forEach(a => {
        if (a[campo]) {
            mapa[a[campo]] = a;
        }
    });
    return mapa;
}

// Cada renderTimeline/renderNotasPrivadas deja placeholders ".adjunto-imagen-wrap"
// (ver UI.renderAdjunto) porque ui.js no hace fetches autenticados. Esto los
// resuelve: pide cada imagen con el Bearer token, arma un blob y lo pinta
// como thumbnail clickeable (abre UI.mostrarImagen con la misma URL, sin
// pedirla de nuevo). Las URLs del batch anterior de ESTE contenedor se
// revocan primero para no acumular blobs sin usar en sesiones largas.
const urlsImagenesPorContenedor = {};

async function cargarImagenesAdjuntas(idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) {
        return;
    }

    (urlsImagenesPorContenedor[idContenedor] || []).forEach(url => URL.revokeObjectURL(url));
    urlsImagenesPorContenedor[idContenedor] = [];

    const nodos = [...contenedor.querySelectorAll(".adjunto-imagen-wrap[data-archivo-id]")];
    const esAdmin = Auth.getRol() === "Administrador";

    await Promise.all(nodos.map(async (nodo) => {
        const idArchivo = Number(nodo.dataset.archivoId);
        const nombre = nodo.dataset.archivoNombre;

        try {
            const respuesta = await fetch(`${API_URL}/archivos/${idArchivo}/descargar`, {
                headers: { Authorization: `Bearer ${Auth.getToken()}` }
            });

            if (!respuesta.ok) {
                throw new Error();
            }

            const blob = await respuesta.blob();
            const url = URL.createObjectURL(blob);
            urlsImagenesPorContenedor[idContenedor].push(url);

            nodo.innerHTML = `<img src="${url}" class="adjunto-imagen-thumb" alt="${nombre}">`;
            nodo.querySelector("img").addEventListener("click", () => {
                UI.mostrarImagen({
                    url,
                    nombre,
                    idArchivo,
                    funcionEliminar: esAdmin ? "eliminarArchivoAdjunto" : null
                });
            });

        } catch {
            nodo.innerHTML = `<span class="small text-danger">No se pudo cargar la imagen.</span>`;
        }
    }));
}

function renderPublicLog(log) {
    logActual = log;
    UI.renderTimeline(document.getElementById("timelinePublico"), log, {
        vacioMensaje: "Todavía no hay actualizaciones registradas para este ticket.",
        editable: true,
        archivosPorEntrada: archivosPorEntrada("id_actualizacion"),
        funcionDescarga: "descargarArchivoAdjunto",
        funcionEliminarArchivo: Auth.getRol() === "Administrador" ? "eliminarArchivoAdjunto" : null
    });
    cargarImagenesAdjuntas("timelinePublico");
}

// Notas privadas: mismo lenguaje visual que el timeline publico (reusa las
// clases .timeline-* de style.css) pero sin estado/badge, porque una nota
// interna no representa un cambio de estado del ticket.
function renderNotasPrivadas(notas) {
    notasPrivadasActual = notas;
    const contenedor = document.getElementById("timelinePrivado");
    if (!contenedor) {
        return;
    }

    if (!notas || notas.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-lock"></i>
                <p class="mb-0">Todavía no hay notas privadas para este ticket.</p>
            </div>
        `;
        return;
    }

    const archivosPorNota = archivosPorEntrada("id_nota_privada");
    const funcionEliminarArchivo = Auth.getRol() === "Administrador" ? "eliminarArchivoAdjunto" : null;
    let fechaAnterior = null;

    contenedor.innerHTML = `
        <div class="timeline">
            ${notas.map(nota => {
                const fechaDia = UI.formatearFechaCorta(nota.fecha_creacion);
                const separadorFecha = fechaDia !== fechaAnterior
                    ? `<div class="timeline-date-divider">${fechaDia}</div>`
                    : "";
                fechaAnterior = fechaDia;

                const archivo = archivosPorNota[nota.id_nota];

                return `
                    ${separadorFecha}
                    <div class="timeline-item">
                        <div class="timeline-marker tone-neutral"><i class="bi bi-chat-left-text-fill"></i></div>
                        <div class="timeline-content">
                            <small class="text-muted">${UI.formatearFecha(nota.fecha_creacion)}</small>
                            <p class="mb-0 mt-2">${nota.contenido}</p>
                            ${UI.renderAdjunto(archivo, { funcionDescarga: "descargarArchivoAdjunto", funcionEliminarArchivo })}
                            <div class="mt-1">
                                <small class="text-muted"><i class="bi bi-person-fill"></i> ${nota.usuario}</small>
                            </div>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
    cargarImagenesAdjuntas("timelinePrivado");
}

async function agregarNotaPrivada(event) {
    event.preventDefault();

    const contenido = document.getElementById("notaPrivadaContenido").value.trim();

    if (!contenido) {
        UI.toast("Escribe el contenido de la nota.", "warning");
        return;
    }

    const archivo = document.getElementById("notaPrivadaArchivo").files[0] || null;
    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Guardando...", async () => {
            const nota = await apiFetch("/notas", {
                method: "POST",
                body: JSON.stringify({
                    id_ticket: ticketActual.id_ticket,
                    contenido
                })
            });

            if (archivo) {
                const datos = new FormData();
                datos.append("archivo", archivo);
                datos.append("id_ticket", ticketActual.id_ticket);
                datos.append("publico", "false");
                datos.append("id_nota_privada", nota.id_nota);
                await apiFetch("/archivos", { method: "POST", body: datos });
            }
        });

        document.getElementById("formNotaPrivada").reset();
        limpiarAdjuntoPreview("notaPrivadaArchivoPreview");
        UI.toast("Nota privada agregada.");

        const [notas, archivos] = await Promise.all([
            apiFetch(`/notas/ticket/${ticketActual.id_ticket}`).catch(() => []),
            apiFetch(`/archivos/ticket/${ticketActual.id_ticket}`).catch(() => [])
        ]);
        archivosActual = archivos;
        renderNotasPrivadas(notas);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function editarActualizacion(id_actualizacion) {
    const entrada = logActual.find(e => e.id_actualizacion === id_actualizacion);
    if (!entrada) {
        return;
    }

    document.getElementById("formEditarNota").dataset.idActualizacion = id_actualizacion;
    document.getElementById("enEstado").value = entrada.estado;
    document.getElementById("enObservaciones").value = entrada.observaciones || "";

    const modal = new bootstrap.Modal(document.getElementById("modalEditarNota"));
    modal.show();
}

// Editar una entrada vieja del historial es solo texto — el backend nunca
// toca la tabla ticket desde este endpoint, asi que esto NO cambia el
// estado actual real del ticket, aunque el campo se llame igual.
async function guardarEdicionNota(event) {
    event.preventDefault();

    const id_actualizacion = document.getElementById("formEditarNota").dataset.idActualizacion;
    const datos = {
        estado: document.getElementById("enEstado").value,
        observaciones: document.getElementById("enObservaciones").value.trim()
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Guardando...", () =>
            apiFetch(`/actualizacion/${id_actualizacion}`, {
                method: "PUT",
                body: JSON.stringify(datos)
            })
        );

        bootstrap.Modal.getInstance(document.getElementById("modalEditarNota")).hide();
        UI.toast("Entrada del historial actualizada.");
        await recargarTicket();

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function renderDiagnostico(diagnostico) {
    diagnosticoActual = diagnostico;
    document.getElementById("dgDiagnostico").value = diagnostico?.diagnostico || "";
    document.getElementById("dgSolucion").value = diagnostico?.solucion || "";
    document.getElementById("dgObservaciones").value = diagnostico?.observaciones || "";

    const boton = document.getElementById("formDiagnostico").querySelector("button[type=submit]");
    boton.innerHTML = diagnostico
        ? `<i class="bi bi-check2"></i> Guardar cambios`
        : `<i class="bi bi-check2-circle"></i> Guardar diagnóstico`;
}

function renderAcciones(ticket) {
    const cerrado = ticket.estado === "Cerrado";

    document.getElementById("btnCerrarTicket").disabled = cerrado;
    document.getElementById("formDiagnostico").querySelector("button[type=submit]").disabled = cerrado;
    document.getElementById("formNuevaNota").querySelector("button[type=submit]").disabled = cerrado;
    document.getElementById("notaEstado").disabled = cerrado;
    document.getElementById("notaObservaciones").disabled = cerrado;
    document.getElementById("notaArchivo").disabled = cerrado;

    document.getElementById("formNotaPrivada").querySelector("button[type=submit]").disabled = cerrado;
    document.getElementById("notaPrivadaContenido").disabled = cerrado;
    document.getElementById("notaPrivadaArchivo").disabled = cerrado;

    document.getElementById("avisoCerrado").classList.toggle("d-none", !cerrado);
}

async function recargarTicket() {
    ticketActual = await apiFetch(`/ticket/${ticketActual.id_ticket}`);
    renderHeader(ticketActual);
    renderAcciones(ticketActual);

    const [log, archivos] = await Promise.all([
        apiFetch(`/actualizacion/ticket/${ticketActual.id_ticket}`).catch(() => []),
        apiFetch(`/archivos/ticket/${ticketActual.id_ticket}`).catch(() => [])
    ]);
    archivosActual = archivos;
    renderPublicLog(log);
}

// Aviso al cliente cuando su ticket avanza — nunca debe bloquear ni romper
// la accion principal (diagnosticar/actualizar/cerrar) si falla.
function notificarCliente(tipo, mensaje) {
    apiFetch("/notificacion", {
        method: "POST",
        body: JSON.stringify({
            id_ticket: ticketActual.id_ticket,
            id_usuario: ticketActual.id_usuario,
            tipo,
            mensaje
        })
    }).catch(() => {});
}

async function guardarDiagnostico(event) {
    event.preventDefault();

    const usuario = Auth.getUsuario();
    const boton = event.target.querySelector("button[type=submit]");
    const editando = Boolean(diagnosticoActual);

    const campos = {
        diagnostico: document.getElementById("dgDiagnostico").value.trim(),
        solucion: document.getElementById("dgSolucion").value.trim(),
        observaciones: document.getElementById("dgObservaciones").value.trim()
    };

    try {
        await UI.conCargando(boton, "Guardando...", async () => {
            if (editando) {
                await apiFetch(`/diagnostico/${diagnosticoActual.id_diagnostico}`, {
                    method: "PUT",
                    body: JSON.stringify(campos)
                });
                return;
            }

            // Guardar el diagnostico ya NO marca el ticket como Resuelto: ese
            // paso ahora requiere una cotizacion aprobada y facturada (o la
            // excepcion explicita de "sin costo"), ver cambiarEstadoConGate.
            // El diagnostico solo habilita cotizar (gate del lado del backend).
            await apiFetch("/diagnostico", {
                method: "POST",
                body: JSON.stringify({
                    id_ticket: ticketActual.id_ticket,
                    id_usuario: usuario.id_usuario,
                    ...campos
                })
            });

            notificarCliente("Diagnóstico", `Se completó el diagnóstico de tu ticket ${Codigos.ticket(ticketActual)}.`);
        });

        UI.toast(editando ? "Diagnóstico actualizado correctamente." : "Diagnóstico guardado correctamente.");
        const diagnosticos = await apiFetch(`/diagnostico/ticket/${ticketActual.id_ticket}`).catch(() => []);
        renderDiagnostico(diagnosticos[0] || null);
        await recargarTicket();
        // El diagnostico recien guardado desbloquea "Cotizar" — refrescar
        // esa seccion sin esperar a que el tecnico recargue la pagina.
        await renderDocumentosRelacionados(ticketActual.id_ticket);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

// Cambia el estado del ticket. Si el destino es "Resuelto" y el backend lo
// rechaza porque no hay cotizacion aprobada+facturada (409), se le ofrece al
// tecnico la excepcion explicita de cerrar sin costo con un motivo — si
// cancela, se lanza { cancelado: true } para que el llamador no siga.
async function cambiarEstadoConGate(estado, motivoSinCosto) {
    const body = { estado };
    if (motivoSinCosto) {
        body.sin_costo = true;
        body.motivo_sin_costo = motivoSinCosto;
    }

    try {
        await apiFetch(`/ticket/${ticketActual.id_ticket}/estado`, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    } catch (error) {
        if (estado === "Resuelto" && error.status === 409 && !motivoSinCosto) {
            const motivo = await pedirMotivoSinCosto();
            if (!motivo) {
                throw { cancelado: true };
            }
            return cambiarEstadoConGate(estado, motivo);
        }
        throw error;
    }
}

// Modal con textarea (UI.confirmar no tiene campo de texto) — devuelve el
// motivo escrito, o null si el tecnico cancela.
function pedirMotivoSinCosto() {
    return new Promise((resolve) => {
        const modalEl = document.getElementById("modalSinCosto");
        const form = document.getElementById("formSinCosto");
        const input = document.getElementById("motivoSinCosto");
        input.value = "";

        const modal = new bootstrap.Modal(modalEl);
        let resuelto = false;

        const alEnviar = (evento) => {
            evento.preventDefault();
            resuelto = true;
            modal.hide();
            resolve(input.value.trim());
        };

        const alOcultar = () => {
            form.removeEventListener("submit", alEnviar);
            modalEl.removeEventListener("hidden.bs.modal", alOcultar);
            if (!resuelto) {
                resolve(null);
            }
        };

        form.addEventListener("submit", alEnviar);
        modalEl.addEventListener("hidden.bs.modal", alOcultar);
        modal.show();
    });
}

async function agregarNota(event) {
    event.preventDefault();

    const usuario = Auth.getUsuario();
    const estado = document.getElementById("notaEstado").value;
    const observaciones = document.getElementById("notaObservaciones").value.trim();

    if (!observaciones) {
        UI.toast("Escribe una observación para el cliente.", "warning");
        return;
    }

    const archivo = document.getElementById("notaArchivo").files[0] || null;
    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Publicando...", async () => {
            // El cambio de estado va primero: si el gate de "Resuelto" lo
            // rechaza (o el tecnico cancela el motivo de sin costo), no se
            // publica un log diciendo "Resuelto" mientras el ticket sigue
            // en su estado anterior.
            if (estado !== ticketActual.estado) {
                await cambiarEstadoConGate(estado);
            }

            const actualizacion = await apiFetch("/actualizacion", {
                method: "POST",
                body: JSON.stringify({
                    id_ticket: ticketActual.id_ticket,
                    id_usuario: usuario.id_usuario,
                    estado,
                    observaciones
                })
            });

            // publico = true: este formulario es siempre el log que ve el
            // cliente, a diferencia de agregarNotaPrivada.
            if (archivo) {
                const datos = new FormData();
                datos.append("archivo", archivo);
                datos.append("id_ticket", ticketActual.id_ticket);
                datos.append("publico", "true");
                datos.append("id_actualizacion", actualizacion.id_actualizacion);
                await apiFetch("/archivos", { method: "POST", body: datos });
            }
        });

        notificarCliente("Actualización", observaciones);
        document.getElementById("formNuevaNota").reset();
        limpiarAdjuntoPreview("notaArchivoPreview");
        UI.toast("Actualización publicada. El cliente ya puede verla.");
        await recargarTicket();

    } catch (error) {
        if (error?.cancelado) {
            return;
        }
        UI.toast(error.message, "danger");
    }
}

async function cerrarTicketDetalle() {
    const confirmado = await UI.confirmar(
        `¿Cerrar el ticket ${Codigos.ticket(ticketActual)}? Esta acción no se puede deshacer.`,
        { titulo: "Cerrar ticket", textoConfirmar: "Sí, cerrar" }
    );

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch(`/ticket/${ticketActual.id_ticket}/cerrar`, { method: "PATCH" });

        await apiFetch("/actualizacion", {
            method: "POST",
            body: JSON.stringify({
                id_ticket: ticketActual.id_ticket,
                id_usuario: Auth.getUsuario().id_usuario,
                estado: "Cerrado",
                observaciones: "El ticket fue cerrado. Gracias por confiar en ITDESK."
            })
        });

        notificarCliente("Cierre", `Tu ticket ${Codigos.ticket(ticketActual)} fue cerrado.`);
        UI.toast("Ticket cerrado correctamente.");
        await recargarTicket();

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initDetalleTicket();
    activarPegarCaptura("notaObservaciones", "notaArchivo", "notaArchivoPreview");
    activarPegarCaptura("notaPrivadaContenido", "notaPrivadaArchivo", "notaPrivadaArchivoPreview");
});
