//========================================
// ITDESK - DETALLE DE TICKET (CLIENTE)
//========================================
// Vista de solo lectura. Nunca importa ni referencia nada del private log:
// separacion real de archivos, no solo ocultamiento visual.
// El backend no expone GET /ticket/:id para Cliente, asi que se busca el
// ticket dentro de la lista que ya trae GET /ticket/mis.
//
// Los archivos ya no tienen una lista aparte (igual que en ticket-tecnico.js):
// una foto colgada de una actualizacion se ve DIRECTO en ese comentario del
// timeline. Este archivo se mantiene independiente/self-contained respecto a
// ticket-tecnico.js a proposito (mismo criterio que el resto de la sesion),
// asi que cargarImagenesAdjuntas esta duplicado, no compartido.

function idDesdeUrl() {
    return new URLSearchParams(window.location.search).get("id");
}

let idTicketActual = null;
let calificacionElegida = 0;
let cotizacionActual = null;

async function initTicketCliente() {
    const id = Number(idDesdeUrl());
    const contenedor = document.getElementById("contenidoTicket");

    if (!id) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-question-circle"></i>
                <p>No se especificó ningún ticket. <a href="dashboard-cliente.html">Volver</a>.</p>
            </div>
        `;
        contenedor.classList.remove("d-none");
        document.getElementById("skeletonTicket").classList.add("d-none");
        return;
    }

    let ticket;

    try {
        const tickets = await apiFetch("/ticket/mis");
        ticket = tickets.find(t => t.id_ticket === id);
    } catch (error) {
        mostrarError(error.message);
        return;
    }

    if (!ticket) {
        mostrarError("Ese ticket no existe o no te pertenece.");
        return;
    }

    idTicketActual = id;
    renderTicket(ticket);
    contenedor.classList.remove("d-none");
    document.getElementById("skeletonTicket").classList.add("d-none");

    cargarCotizacion(id);

    if (ticket.estado === "Cerrado") {
        cargarEncuesta(id);
    }

    try {
        // el cliente solo ve archivos publicos (el backend ya filtra por
        // publico=1 y dueño del ticket) — se piden en paralelo con las
        // notas para poder armar el mapa {id_actualizacion: archivo} antes
        // de renderizar el timeline.
        const [notas, archivos] = await Promise.all([
            apiFetch(`/actualizacion/notas/${id}`),
            apiFetch(`/archivos/mis/ticket/${id}`).catch(() => [])
        ]);

        const archivosPorEntrada = {};
        archivos.forEach(a => {
            if (a.id_actualizacion) {
                archivosPorEntrada[a.id_actualizacion] = a;
            }
        });

        UI.renderTimeline(document.getElementById("timelinePublico"), notas, {
            vacioMensaje: "Todavía no hay novedades registradas para este ticket.",
            archivosPorEntrada,
            funcionDescarga: "descargarArchivoCliente"
        });
        cargarImagenesAdjuntas("timelinePublico");

    } catch (error) {
        document.getElementById("timelinePublico").innerHTML =
            `<p class="text-danger mb-0">${error.message}</p>`;
    }
}

// Resuelve los placeholders ".adjunto-imagen-wrap" que UI.renderAdjunto deja
// en el timeline (ui.js no hace fetches autenticados): pide cada imagen con
// el Bearer token, arma un blob y la pinta como thumbnail clickeable que
// abre UI.mostrarImagen — sin boton de Eliminar, Cliente nunca puede borrar.
let urlsImagenesTimeline = [];

async function cargarImagenesAdjuntas(idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) {
        return;
    }

    urlsImagenesTimeline.forEach(url => URL.revokeObjectURL(url));
    urlsImagenesTimeline = [];

    const nodos = [...contenedor.querySelectorAll(".adjunto-imagen-wrap[data-archivo-id]")];

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
            urlsImagenesTimeline.push(url);

            nodo.innerHTML = `<img src="${url}" class="adjunto-imagen-thumb" alt="${nombre}">`;
            nodo.querySelector("img").addEventListener("click", () => {
                UI.mostrarImagen({ url, nombre });
            });

        } catch {
            nodo.innerHTML = `<span class="small text-danger">No se pudo cargar la imagen.</span>`;
        }
    }));
}

async function descargarArchivoCliente(id_archivo, nombreOriginal) {
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

function mostrarError(mensaje) {
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

function renderTicket(ticket) {
    document.getElementById("breadcrumbTicket").textContent = Codigos.ticket(ticket);
    document.getElementById("tituloTicket").textContent = ticket.titulo;
    document.getElementById("badgeEstadoTicket").innerHTML = UI.badgeEstado(ticket.estado);
    document.getElementById("badgeCategoriaTicket").innerHTML = UI.badgeCategoria(ticket.categoria);
    document.getElementById("fechaAperturaTicket").textContent = UI.formatearFecha(ticket.fecha_apertura);
    document.getElementById("descripcionTicket").textContent = ticket.descripcion;

    if (ticket.fecha_cierre) {
        document.getElementById("fechaCierreWrap").classList.remove("d-none");
        document.getElementById("fechaCierreTicket").textContent = UI.formatearFecha(ticket.fecha_cierre);
    }

    document.getElementById("infoEquipo").innerHTML = `
        <dl class="row mb-0">
            <dt class="col-5">Tipo</dt><dd class="col-7">${ticket.equipo_tipo}</dd>
            <dt class="col-5">Marca</dt><dd class="col-7">${ticket.equipo_marca}</dd>
            <dt class="col-5">Modelo</dt><dd class="col-7">${ticket.equipo_modelo}</dd>
            <dt class="col-5">N.° de serie</dt><dd class="col-7">${ticket.equipo_numero_serie}</dd>
        </dl>
    `;
}

// La cotizacion es del cliente, no del ticket (puede incluir otros equipos
// suyos), pero /detalle-cotizacion/mis/ticket/:id ya resuelve "cual es la
// linea de ESTE ticket" con el chequeo de dueño hecho del lado del backend.
// Si el ticket nunca tuvo cotizacion, o el tecnico no tiene permiso para
// verla (no deberia pasar, pero por las dudas), la seccion se queda oculta.
async function cargarCotizacion(id_ticket) {
    try {
        const lineas = await apiFetch(`/detalle-cotizacion/mis/ticket/${id_ticket}`);
        if (lineas.length === 0) {
            return;
        }

        const cotizacion = await apiFetch(`/cotizacion/mis/${lineas[0].id_cotizacion}`);
        document.getElementById("filaCotizacion").classList.remove("d-none");
        renderCotizacion(cotizacion, lineas[0]);

    } catch {
        // sin cotizacion o sin permiso: la seccion se queda oculta, no es
        // critico para ver el resto del ticket
    }
}

function renderCotizacion(cotizacion, linea) {
    cotizacionActual = cotizacion;

    const acciones = cotizacion.estado === "Pendiente" ? `
        <div class="d-flex gap-2 mt-3 flex-wrap">
            <button class="btn btn-success btn-sm" type="button" onclick="aprobarCotizacionCliente()">
                <i class="bi bi-check2-circle"></i> Aprobar
            </button>
            <button class="btn btn-outline-danger btn-sm" type="button" onclick="rechazarCotizacionCliente()">
                <i class="bi bi-x-circle"></i> Rechazar
            </button>
        </div>
    ` : "";

    document.getElementById("cuerpoCotizacion").innerHTML = `
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
                <h5 class="mb-1"><span class="codigo">${Codigos.cotizacion(cotizacion)}</span></h5>
                <p class="text-muted small mb-0">${UI.formatearFecha(cotizacion.fecha_creacion)}</p>
            </div>
            ${UI.badge(cotizacion.estado, UI.MAPA_ESTADO_COTIZACION)}
        </div>
        <hr>
        <p class="mb-2">${linea.descripcion_servicio}</p>
        <dl class="row small mb-0">
            <dt class="col-6">Mano de obra</dt><dd class="col-6 text-end tabular-nums">RD$ ${Number(linea.mano_obra).toFixed(2)}</dd>
            <dt class="col-6">Repuestos</dt><dd class="col-6 text-end tabular-nums">RD$ ${Number(linea.repuestos).toFixed(2)}</dd>
            ${Number(linea.descuento) > 0 ? `<dt class="col-6">Descuento</dt><dd class="col-6 text-end tabular-nums">- RD$ ${Number(linea.descuento).toFixed(2)}</dd>` : ""}
        </dl>
        <hr>
        <div class="d-flex justify-content-between align-items-center">
            <span class="fw-semibold">Total a pagar (con ITBIS)</span>
            <span class="fs-5 fw-semibold tabular-nums">RD$ ${Number(cotizacion.total).toFixed(2)}</span>
        </div>
        ${cotizacion.detalle?.length > 1 ? `<p class="small text-muted mt-2 mb-0"><i class="bi bi-info-circle"></i> Esta cotización incluye otros equipos tuyos además de este ticket.</p>` : ""}
        ${cotizacion.estado === "Pendiente" ? `<p class="small text-muted mt-3 mb-0">Revisá el detalle con tu técnico antes de decidir — una vez que apruebes o rechaces, no se puede cambiar.</p>` : ""}
        ${acciones}
    `;
}

// Aprobar/rechazar es de una sola via: el backend nunca deja volver a
// Pendiente ni cambiar entre estados finales, por eso la confirmacion
// explicita lo advierte.
async function aprobarCotizacionCliente() {
    const confirmado = await UI.confirmar(
        "¿Aprobar esta cotización? El técnico podrá continuar con la reparación. Una vez aprobada no se puede modificar ni volver a Pendiente.",
        { titulo: "Aprobar cotización", textoConfirmar: "Sí, aprobar", claseConfirmar: "btn-success" }
    );

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch(`/cotizacion/mis/${cotizacionActual.id_cotizacion}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: "Aprobada" })
        });
        UI.toast("Cotización aprobada. El técnico ya puede continuar.");
        await cargarCotizacion(idTicketActual);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function rechazarCotizacionCliente() {
    const confirmado = await UI.confirmar(
        "¿Rechazar esta cotización? Esta acción no se puede deshacer. Podés pedirle al técnico una nueva cotización si cambiás de opinión.",
        { titulo: "Rechazar cotización", textoConfirmar: "Sí, rechazar" }
    );

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch(`/cotizacion/mis/${cotizacionActual.id_cotizacion}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: "Rechazada" })
        });
        UI.toast("Cotización rechazada.");
        await cargarCotizacion(idTicketActual);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

// Solo se llama si el ticket ya esta Cerrado (ver initTicketCliente) — no
// tiene sentido pedir satisfaccion sobre una reparacion en curso, y el
// backend rechaza el POST igual si se intentara antes.
async function cargarEncuesta(id_ticket) {
    try {
        const encuesta = await apiFetch(`/encuestas/mis/ticket/${id_ticket}`);
        document.getElementById("filaEncuesta").classList.remove("d-none");

        if (encuesta) {
            renderEncuestaEnviada(encuesta);
        } else {
            renderFormularioEncuesta();
        }

    } catch {
        // si falla, simplemente no se muestra la seccion — no es critico
        // para ver el resto del ticket
    }
}

function renderFormularioEncuesta() {
    calificacionElegida = 0;
    document.getElementById("cuerpoEncuesta").innerHTML = `
        <h5 class="mb-1"><i class="bi bi-star"></i> ¿Cómo fue tu experiencia?</h5>
        <p class="text-muted small mb-3">Tu ticket ya se cerró — contanos qué te pareció el servicio.</p>
        <form id="formEncuesta" onsubmit="enviarEncuesta(event)">
            <div class="estrellas-picker mb-2" id="estrellasPicker">
                ${[1, 2, 3, 4, 5].map(n => `<i class="bi bi-star" data-valor="${n}" onclick="elegirEstrella(${n})"></i>`).join("")}
            </div>
            <div class="mb-3">
                <label class="form-label small" for="comentarioEncuesta">Comentario (opcional)</label>
                <textarea class="form-control" id="comentarioEncuesta" rows="2" placeholder="Contanos más sobre tu experiencia..."></textarea>
            </div>
            <button class="btn btn-primary btn-sm" type="submit">
                <i class="bi bi-send-fill"></i> Enviar calificación
            </button>
        </form>
    `;
}

function elegirEstrella(valor) {
    calificacionElegida = valor;
    document.querySelectorAll("#estrellasPicker i").forEach(estrella => {
        const esta = Number(estrella.dataset.valor) <= valor;
        estrella.classList.toggle("bi-star-fill", esta);
        estrella.classList.toggle("bi-star", !esta);
        estrella.classList.toggle("activa", esta);
    });
}

async function enviarEncuesta(event) {
    event.preventDefault();

    if (!calificacionElegida) {
        UI.toast("Selecciona al menos una estrella.", "warning");
        return;
    }

    const comentario = document.getElementById("comentarioEncuesta").value.trim();
    const boton = event.target.querySelector("button[type=submit]");

    try {
        const encuesta = await UI.conCargando(boton, "Enviando...", () => apiFetch("/encuestas", {
            method: "POST",
            body: JSON.stringify({
                id_ticket: idTicketActual,
                calificacion: calificacionElegida,
                comentario
            })
        }));

        UI.toast("¡Gracias por tu calificación!");
        renderEncuestaEnviada(encuesta);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function renderEncuestaEnviada(encuesta) {
    const estrellas = [1, 2, 3, 4, 5]
        .map(n => `<i class="bi ${n <= encuesta.calificacion ? "bi-star-fill" : "bi-star"}"></i>`)
        .join("");

    document.getElementById("cuerpoEncuesta").innerHTML = `
        <h5 class="mb-2"><i class="bi bi-check-circle-fill text-success"></i> ¡Gracias por tu calificación!</h5>
        <div class="estrellas-estaticas mb-2">${estrellas}</div>
        ${encuesta.comentario ? `<p class="text-muted mb-0">"${encuesta.comentario}"</p>` : ""}
    `;
}

document.addEventListener("DOMContentLoaded", initTicketCliente);
