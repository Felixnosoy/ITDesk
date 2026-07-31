//========================================
// ITDESK - TECNICO (dashboard-tecnico.html)
//========================================
// La gestion del ticket (diagnostico, notas, cierre) vive en
// detalle-ticket.html / ticket-tecnico.js. Esta pantalla es un tablero
// Kanban: lista, busca, y permite mover un ticket de columna arrastrandolo
// (ver manejarDropTicket) — pero las reglas de negocio de esos cambios de
// estado son las mismas que ya existen en ticket-tecnico.js/backend, no se
// inventa ninguna nueva aca.

let ticketsTecnico = [];
let terminoTecnico = "";

// Columnas del tablero, en orden. "Abierto" no acepta drop (el backend no
// soporta volver a ese estado via PATCH /ticket/:id/estado — ver
// backend/src/services/ticket.service.js) — se marca con dropHabilitado:false
// para que la columna simplemente rechace el drag visualmente.
const COLUMNAS_KANBAN = [
    { estado: "Abierto", titulo: "Abierto", icono: "bi-exclamation-circle-fill", dropHabilitado: false },
    { estado: "En proceso", titulo: "En proceso", icono: "bi-hourglass-split", dropHabilitado: true },
    { estado: "Resuelto", titulo: "Resuelto", icono: "bi-check-circle-fill", dropHabilitado: true },
    { estado: "Cerrado", titulo: "Cerrado", icono: "bi-lock-fill", dropHabilitado: true }
];

const ORDEN_PRIORIDAD_COLA = { Alta: 0, Media: 1, Baja: 2 };

const PROXIMA_ACCION = {
    Abierto: { texto: "Diagnosticar", clase: "btn-primary", icono: "bi-clipboard2-pulse" },
    "En proceso": { texto: "Continuar", clase: "btn-primary", icono: "bi-arrow-right-circle" },
    Resuelto: { texto: "Revisar", clase: "btn-outline-secondary", icono: "bi-eye" },
    Cerrado: { texto: "Ver", clase: "btn-outline-secondary", icono: "bi-eye" }
};

// Todos los tecnicos ven todos los tickets — la asignacion ya no restringe
// quien puede trabajar en cuál, solo marca un "especialista sugerido" por
// ticket. Un solo GET /ticket para todos + /asignacion para saber quien es
// el especialista de cada uno (evita N+1).
async function cargarTicketsTecnico() {
    const tablero = document.getElementById("tableroTecnico");
    if (!tablero) {
        return;
    }

    renderSkeletonTablero();

    try {
        const [tickets, asignaciones, equipos] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/asignacion").catch(() => []),
            apiFetch("/equipo").catch(() => [])
        ]);

        const especialistaPorTicket = {};
        asignaciones.filter(a => a.activa).forEach(a => {
            especialistaPorTicket[a.id_ticket] = a;
        });

        // solo para poder buscar por codigo de equipo (Codigos.equipo) — el
        // ticket no trae la fecha_registro del equipo, asi que se resuelve
        // con un solo fetch en bloque, no uno por ticket.
        const equiposPorId = new Map(equipos.map(e => [e.id_equipo, e]));

        ticketsTecnico = tickets.map(t => {
            const activa = especialistaPorTicket[t.id_ticket];
            return {
                ...t,
                equipo_codigo: equiposPorId.has(t.id_equipo) ? Codigos.equipo(equiposPorId.get(t.id_equipo)) : "",
                especialista: activa ? activa.tecnico : "",
                especialista_id: activa ? activa.id_usuario : null
            };
        });

        actualizarStatsTecnico(ticketsTecnico);
        renderMiRendimiento(ticketsTecnico);
        renderTablero();

    } catch (error) {
        tablero.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    <p class="mb-0 text-danger">${error.message}</p>
                </div>
            </div>
        `;
    }
}

function renderSkeletonTablero() {
    const tablero = document.getElementById("tableroTecnico");
    tablero.innerHTML = COLUMNAS_KANBAN.map(col => `
        <div class="col-md-6 col-lg-3">
            <div class="kanban-column">
                <div class="kanban-column-head"><i class="bi ${col.icono}"></i> ${col.titulo}</div>
                <span class="skeleton-line" style="height:70px;"></span>
                <span class="skeleton-line mt-2" style="height:70px;"></span>
            </div>
        </div>
    `).join("");
}

const CAMPOS_BUSQUEDA_TECNICO = [
    t => `${Codigos.ticket(t)} ${t.id_ticket}`,
    "cliente",
    "equipo_tipo",
    "equipo_marca",
    "equipo_modelo",
    "equipo_numero_serie",
    "equipo_codigo",
    "estado",
    "titulo",
    "categoria",
    "especialista"
];

function ticketsFiltrados() {
    return Search.filtrar(ticketsTecnico, terminoTecnico, CAMPOS_BUSQUEDA_TECNICO);
}

function renderTablero() {
    const filtrados = ticketsFiltrados();
    const tablero = document.getElementById("tableroTecnico");

    if (ticketsTecnico.length === 0) {
        tablero.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-inbox"></i>
                    <p class="mb-0">No hay tickets en la cola todavía.</p>
                </div>
            </div>
        `;
        return;
    }

    if (filtrados.length === 0) {
        tablero.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <p class="mb-0">Ningún ticket coincide con la búsqueda.</p>
                </div>
            </div>
        `;
        return;
    }

    tablero.innerHTML = COLUMNAS_KANBAN.map(col => {
        const ticketsColumna = filtrados
            .filter(t => t.estado === col.estado)
            .sort((a, b) => (ORDEN_PRIORIDAD_COLA[a.prioridad] ?? 9) - (ORDEN_PRIORIDAD_COLA[b.prioridad] ?? 9));

        return `
            <div class="col-md-6 col-lg-3">
                <div class="kanban-column" data-estado="${col.estado}" data-drop="${col.dropHabilitado}">
                    <div class="kanban-column-head">
                        <span><i class="bi ${col.icono}"></i> ${col.titulo}</span>
                        <span class="badge-pill tone-neutral">${ticketsColumna.length}</span>
                    </div>
                    <div class="kanban-column-body">
                        ${ticketsColumna.map(renderTarjetaKanban).join("") || `<p class="text-muted small text-center py-3 mb-0">Vacío</p>`}
                    </div>
                </div>
            </div>
        `;
    }).join("");

    conectarDragAndDrop();
}

function renderTarjetaKanban(ticket) {
    const accion = PROXIMA_ACCION[ticket.estado] || PROXIMA_ACCION.Cerrado;
    const esReciente = String(ticket.id_ticket) === sessionStorage.getItem("ultimoTicketVisto");

    return `
        <div class="kanban-card ${esReciente ? "fila-reciente" : ""}" draggable="true" data-id-ticket="${ticket.id_ticket}">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <span class="text-muted small">${Codigos.ticket(ticket)}</span>
                ${UI.badgePrioridad(ticket.prioridad)}
            </div>
            <p class="fw-semibold mb-1">${ticket.titulo}</p>
            <p class="text-muted small mb-2">${ticket.cliente} · ${ticket.equipo_tipo} ${ticket.equipo_marca}</p>
            <div class="d-flex justify-content-between align-items-center gap-2">
                ${ticket.especialista
                    ? `<span class="badge-pill tone-neutral"><i class="bi bi-person-check-fill"></i> ${ticket.especialista}</span>`
                    : `<span class="text-muted small">Sin asignar</span>`}
                ${UI.badgeCategoria(ticket.categoria)}
            </div>
            <a class="btn ${accion.clase} btn-sm w-100 mt-2" href="detalle-ticket.html?id=${ticket.id_ticket}">
                <i class="bi ${accion.icono}"></i> ${accion.texto}
            </a>
        </div>
    `;
}

// Drag and Drop nativo (HTML5 DnD API) — sin libreria nueva. Las cards se
// re-renderizan en cada busqueda/carga, asi que los listeners se conectan
// de nuevo cada vez (conectarDragAndDrop se llama al final de renderTablero).
function conectarDragAndDrop() {
    document.querySelectorAll(".kanban-card").forEach(card => {
        card.addEventListener("dragstart", (evento) => {
            evento.dataTransfer.setData("text/plain", card.dataset.idTicket);
            evento.dataTransfer.effectAllowed = "move";
            card.classList.add("dragging");
        });
        card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });

    document.querySelectorAll(".kanban-column").forEach(columna => {
        columna.addEventListener("dragover", (evento) => {
            evento.preventDefault();
            evento.dataTransfer.dropEffect = columna.dataset.drop === "true" ? "move" : "none";
            columna.classList.add("drag-over");
        });
        columna.addEventListener("dragleave", () => columna.classList.remove("drag-over"));
        columna.addEventListener("drop", (evento) => {
            evento.preventDefault();
            columna.classList.remove("drag-over");

            const idTicket = Number(evento.dataTransfer.getData("text/plain"));
            const ticket = ticketsTecnico.find(t => t.id_ticket === idTicket);
            if (!ticket) {
                return;
            }
            manejarDropTicket(ticket, columna.dataset.estado, columna.dataset.drop === "true");
        });
    });
}

// Replica exactamente las reglas que ya existen en ticket-tecnico.js/backend
// para cada cambio de estado — el drag-and-drop es una entrada nueva a la
// misma logica, no una logica nueva (ver plan de Fase 4, pieza 6).
async function manejarDropTicket(ticket, estadoDestino, dropHabilitado) {
    if (ticket.estado === estadoDestino) {
        return;
    }

    if (!dropHabilitado) {
        UI.toast('Un ticket no puede volver a "Abierto" arrastrándolo — no existe ese flujo.', "warning");
        return;
    }

    // capturado antes del PATCH: ticket es el objeto que ya tenia el
    // tablero, cargarTicketsTecnico() (mas abajo) es lo unico que lo
    // reemplaza con datos frescos.
    const estadoAnterior = ticket.estado;

    try {
        if (estadoDestino === "Cerrado") {
            // Endpoint distinto a /estado, sin relacion con "Resuelto" — el
            // backend no exige pasar primero por Resuelto (cerrarTicket,
            // ticket.service.js, no tiene esa validacion).
            const ok = await UI.confirmar(
                `¿Cerrar el ticket ${Codigos.ticket(ticket)}? Esta acción no se puede deshacer.`,
                { titulo: "Cerrar ticket", textoConfirmar: "Sí, cerrar", claseConfirmar: "btn-danger" }
            );
            if (!ok) {
                return;
            }
            await apiFetch(`/ticket/${ticket.id_ticket}/cerrar`, { method: "PATCH" });
        } else {
            await cambiarEstadoConGateKanban(ticket, estadoDestino);
        }

        notificarCambioEstadoKanban(ticket, estadoAnterior, estadoDestino);

        UI.toast(`${Codigos.ticket(ticket)} → ${estadoDestino}`);
        cargarTicketsTecnico();

    } catch (error) {
        if (error) {
            UI.toast(error.message, "danger");
        }
    }
}

// Mismo criterio de tipos que agregarNota() en ticket-tecnico.js (Salida 5:
// el Kanban es una entrada mas al mismo cambio de estado, asi que tiene que
// avisar al cliente igual que el formulario de la pagina de detalle — antes
// de esto, mover un ticket por drag-and-drop no generaba ninguna notificacion).
function notificarCambioEstadoKanban(ticket, estadoAnterior, estadoNuevo) {
    let tipo = "Estado";
    let mensaje = `Tu ticket ${Codigos.ticket(ticket)} cambió de estado: ahora está "${estadoNuevo}".`;

    if (estadoNuevo === "Resuelto") {
        tipo = "Finalización";
        mensaje = `Tu ticket ${Codigos.ticket(ticket)} fue marcado como resuelto.`;
    } else if (estadoNuevo === "En proceso" && estadoAnterior === "Resuelto") {
        tipo = "Reapertura";
        mensaje = `Tu ticket ${Codigos.ticket(ticket)} fue reabierto y sigue en proceso.`;
    } else if (estadoNuevo === "Cerrado") {
        tipo = "Cierre";
        mensaje = `Tu ticket ${Codigos.ticket(ticket)} fue cerrado.`;
    }

    apiFetch("/notificacion", {
        method: "POST",
        body: JSON.stringify({ id_ticket: ticket.id_ticket, id_usuario: ticket.id_usuario, tipo, mensaje })
    }).catch(() => {});
}

// Mismo gate que cambiarEstadoConGate en ticket-tecnico.js: el backend
// rechaza "Resuelto" con 409 si no hay cotizacion aprobada+facturada, salvo
// que se mande sin_costo+motivo_sin_costo.
async function cambiarEstadoConGateKanban(ticket, estadoDestino, opciones = {}) {
    try {
        await apiFetch(`/ticket/${ticket.id_ticket}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: estadoDestino, ...opciones })
        });
    } catch (error) {
        if (error.status === 409 && estadoDestino === "Resuelto" && !opciones.sin_costo) {
            const motivo = await UI.pedirTexto(
                "Este ticket no tiene una cotización aprobada y facturada. Indicá el motivo para resolverlo sin costo.",
                {
                    titulo: "Resolver sin costo",
                    textoConfirmar: "Resolver sin costo",
                    placeholder: "Ej: garantía, cortesía, error de diagnóstico previo..."
                }
            );
            if (motivo === null) {
                return;
            }
            return cambiarEstadoConGateKanban(ticket, estadoDestino, { sin_costo: true, motivo_sin_costo: motivo });
        }
        throw error;
    }
}

function actualizarStatsTecnico(tickets) {
    document.getElementById("statsAsignados").textContent = tickets.length;
    document.getElementById("statsEnProceso").textContent =
        tickets.filter(t => t.estado === "En proceso").length;
    document.getElementById("statsFinalizados").textContent =
        tickets.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado").length;
}

// "Mi rendimiento" — version personal, sin filtros, del Reporte de
// Rendimiento de Tecnicos que ve Administrador en reportes.html (misma
// formula: eficiencia = resueltos/asignados, tiempo promedio solo sobre
// tickets con fecha_resolucion). Se filtra por especialista_id === yo, no
// por nombre, para no confundir tecnicos con nombres parecidos.
function renderMiRendimiento(tickets) {
    const elTiempo = document.getElementById("statsTiempoProm");
    const elEficiencia = document.getElementById("statsEficiencia");
    if (!elTiempo || !elEficiencia) {
        return;
    }

    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!usuario) {
        return;
    }

    const misTickets = tickets.filter(t => t.especialista_id === usuario.id_usuario);
    const asignados = misTickets.length;
    const resueltos = misTickets.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado").length;

    const tiempos = misTickets
        .filter(t => t.fecha_resolucion)
        .map(t => (new Date(t.fecha_resolucion) - new Date(t.fecha_apertura)) / 3600000);
    const tiempoProm = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null;
    const eficiencia = asignados > 0 ? Math.round((resueltos / asignados) * 100) : null;

    elTiempo.textContent = tiempoProm !== null ? `${tiempoProm.toFixed(1)} hrs` : "—";
    elEficiencia.textContent = eficiencia !== null ? `${eficiencia}%` : "—";
}

document.addEventListener("DOMContentLoaded", () => {
    cargarTicketsTecnico();

    Search.conectar(document.getElementById("buscarTicketTecnico"), (termino) => {
        terminoTecnico = termino;
        renderTablero();
        return ticketsFiltrados().length;
    }, "resultadosBusquedaTicketTecnico");
});
