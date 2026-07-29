//========================================
// ITDESK - TECNICO (dashboard-tecnico.html)
//========================================
// La gestion del ticket (diagnostico, notas, cierre) vive ahora en
// detalle-ticket.html / ticket-tecnico.js. Esta pantalla solo lista y busca.

let ticketsTecnico = [];
let terminoTecnico = "";
let ordenTecnico = { campo: null, direccion: "asc" };

// Todos los tecnicos ven todos los tickets — la asignacion ya no restringe
// quien puede trabajar en cuál, solo marca un "especialista sugerido" por
// ticket. Antes esta funcion pedia solo /asignacion/tecnico/:id y resolvia
// un ticket a la vez (N+1); ahora es un solo GET /ticket para todos +
// /asignacion para saber quien es el especialista de cada uno.
async function cargarTicketsTecnico() {
    const tabla = document.getElementById("tablaTecnico");
    if (!tabla) {
        return;
    }

    UI.renderSkeleton(tabla, 9);

    try {
        const [tickets, asignaciones, equipos] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/asignacion").catch(() => []),
            apiFetch("/equipo").catch(() => [])
        ]);

        const especialistaPorTicket = {};
        asignaciones.filter(a => a.activa).forEach(a => {
            especialistaPorTicket[a.id_ticket] = a.tecnico;
        });

        // solo para poder buscar por codigo de equipo (Codigos.equipo) — el
        // ticket no trae la fecha_registro del equipo, asi que se resuelve
        // con un solo fetch en bloque, no uno por ticket.
        const equiposPorId = new Map(equipos.map(e => [e.id_equipo, e]));

        ticketsTecnico = tickets.map(t => ({
            ...t,
            equipo_codigo: equiposPorId.has(t.id_equipo) ? Codigos.equipo(equiposPorId.get(t.id_equipo)) : "",
            especialista: especialistaPorTicket[t.id_ticket] || ""
        }));

        if (ticketsTecnico.length === 0) {
            UI.renderEmptyState(tabla, 9, "No hay tickets en la cola todavía.", "bi-inbox");
            actualizarStatsTecnico([]);
            return;
        }

        actualizarStatsTecnico(ticketsTecnico);
        actualizarTablaTecnico();

    } catch (error) {
        UI.renderErrorRow(tabla, 9, error.message);
    }
}

// Orden de trabajo: lo que necesita accion primero (Abierto > En proceso >
// Resuelto > Cerrado), y dentro de cada grupo, prioridad alta primero.
const ORDEN_ESTADO_COLA = { Abierto: 0, "En proceso": 1, Resuelto: 2, Cerrado: 3 };
const ORDEN_PRIORIDAD_COLA = { Alta: 0, Media: 1, Baja: 2 };
const GRUPOS_COLA = {
    Abierto: { titulo: "Requiere atención", icono: "bi-exclamation-circle-fill" },
    "En proceso": { titulo: "En proceso", icono: "bi-hourglass-split" },
    Resuelto: { titulo: "Resueltos recientemente", icono: "bi-check-circle-fill" },
    Cerrado: { titulo: "Cerrados", icono: "bi-lock-fill" }
};

const PROXIMA_ACCION = {
    Abierto: { texto: "Diagnosticar", clase: "btn-primary", icono: "bi-clipboard2-pulse" },
    "En proceso": { texto: "Continuar", clase: "btn-primary", icono: "bi-arrow-right-circle" },
    Resuelto: { texto: "Revisar", clase: "btn-outline-secondary", icono: "bi-eye" },
    Cerrado: { texto: "Ver", clase: "btn-outline-secondary", icono: "bi-eye" }
};

// Orden de trabajo compartido entre la carga inicial y cada re-filtrado —
// separado del render para que la paginacion (UI.paginarRender) pueda
// ordenar antes de recortar, no al reves (si se recortara antes de
// ordenar, "los primeros 50" serian un grupo arbitrario, no los mas urgentes).
function ordenarColaTecnico(tickets) {
    return [...tickets].sort((a, b) => {
        const porEstado = (ORDEN_ESTADO_COLA[a.estado] ?? 9) - (ORDEN_ESTADO_COLA[b.estado] ?? 9);
        if (porEstado !== 0) {
            return porEstado;
        }
        return (ORDEN_PRIORIDAD_COLA[a.prioridad] ?? 9) - (ORDEN_PRIORIDAD_COLA[b.prioridad] ?? 9);
    });
}

const EXTRACTORES_ORDEN_TECNICO = {
    prioridad: t => ORDEN_PRIORIDAD_COLA[t.prioridad] ?? 9,
    estado: t => ORDEN_ESTADO_COLA[t.estado] ?? 9,
    especialista: t => t.especialista || ""
};

// Un orden manual (click en un encabezado) reemplaza la cola agrupada por
// una lista plana ordenada por esa columna — agrupar por estado no tiene
// sentido si la fila de arriba ya no representa un unico estado.
function actualizarTablaTecnico() {
    const filtrados = Search.filtrar(ticketsTecnico, terminoTecnico, [
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
    ]);

    const agrupar = !ordenTecnico.campo;
    const datos = agrupar
        ? ordenarColaTecnico(filtrados)
        : Ordenar.aplicar(filtrados, ordenTecnico.campo, ordenTecnico.direccion, EXTRACTORES_ORDEN_TECNICO[ordenTecnico.campo]);

    UI.paginarRender(
        datos,
        (visibles, ordenados) => renderTablaTecnico(visibles, ordenados, agrupar),
        document.getElementById("verMasTecnico")
    );
    return datos.length;
}

// visibles: la porcion a pintar (ya recortada por UI.paginarRender).
// ordenados: la lista completa ya ordenada, usada solo para que el conteo
// por grupo sea el total real aunque la pagina actual muestre menos.
// agrupar: false cuando hay un orden manual activo (click en un
// encabezado) — agrupar por estado dejaria de tener sentido si la fila de
// arriba dice "Titulo" en vez de "Requiere atencion".
function renderTablaTecnico(visibles, ordenados = visibles, agrupar = true) {
    const tabla = document.getElementById("tablaTecnico");

    if (visibles.length === 0) {
        UI.renderEmptyState(tabla, 9, "Ningún ticket coincide con la búsqueda.", "bi-search");
        return;
    }

    // conteo por grupo, para que una cola larga se pueda priorizar sin
    // desplazarse (cuantos hay en "Requiere atencion" antes de scrollear)
    const conteoPorGrupo = ordenados.reduce((acc, t) => {
        acc[t.estado] = (acc[t.estado] || 0) + 1;
        return acc;
    }, {});

    let filas = "";
    let grupoActual = null;

    visibles.forEach(ticket => {
        if (agrupar && ticket.estado !== grupoActual) {
            grupoActual = ticket.estado;
            const grupo = GRUPOS_COLA[grupoActual] || { titulo: grupoActual, icono: "bi-circle" };
            filas += `
                <tr class="table-group-row">
                    <td colspan="9"><i class="bi ${grupo.icono}"></i> ${grupo.titulo} (${conteoPorGrupo[grupoActual]})</td>
                </tr>
            `;
        }

        const accion = PROXIMA_ACCION[ticket.estado] || PROXIMA_ACCION.Cerrado;
        const esReciente = String(ticket.id_ticket) === sessionStorage.getItem("ultimoTicketVisto");

        filas += `
            <tr class="${esReciente ? "fila-reciente" : ""}">
                <td data-label="ID">${Codigos.ticket(ticket)}</td>
                <td data-label="Cliente">${ticket.cliente}</td>
                <td data-label="Equipo">${ticket.equipo_tipo} ${ticket.equipo_marca}</td>
                <td data-label="Problema">${ticket.titulo}</td>
                <td data-label="Prioridad">${UI.badgePrioridad(ticket.prioridad)}</td>
                <td data-label="Categoría">${UI.badgeCategoria(ticket.categoria)}</td>
                <td data-label="Estado">${UI.badgeEstado(ticket.estado)}</td>
                <td data-label="Especialista">${ticket.especialista
                    ? `<span class="badge-pill tone-neutral"><i class="bi bi-person-check-fill"></i> ${ticket.especialista}</span>`
                    : `<span class="text-muted small">Sin asignar</span>`}</td>
                <td data-label="Próxima acción">
                    <a class="btn ${accion.clase} btn-sm" href="detalle-ticket.html?id=${ticket.id_ticket}">
                        <i class="bi ${accion.icono}"></i> ${accion.texto}
                    </a>
                </td>
            </tr>
        `;
    });

    tabla.innerHTML = filas;
}

function actualizarStatsTecnico(tickets) {
    document.getElementById("statsAsignados").textContent = tickets.length;
    document.getElementById("statsEnProceso").textContent =
        tickets.filter(t => t.estado === "En proceso").length;
    document.getElementById("statsFinalizados").textContent =
        tickets.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado").length;
}

document.addEventListener("DOMContentLoaded", () => {
    cargarTicketsTecnico();

    Ordenar.conectar(document.getElementById("tablaTecnico")?.closest("table"), (campo, direccion) => {
        ordenTecnico = { campo, direccion };
        actualizarTablaTecnico();
    });

    Search.conectar(document.getElementById("buscarTicketTecnico"), (termino) => {
        terminoTecnico = termino;
        return actualizarTablaTecnico();
    }, "resultadosBusquedaTicketTecnico");
});
