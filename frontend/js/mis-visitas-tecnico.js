//========================================
// ITDESK - MIS VISITAS TECNICAS (Tecnico)
//========================================

let visitasTecnicoPropias = [];

// Solo tiene sentido avanzar el estado desde aca cuando Recepcion ya
// confirmo la visita (le asigno tecnico y, si hacia falta, genero el
// ticket) — "Pendiente"/"Reprogramada" quedan a la espera, sin acciones.
const SIGUIENTE_ESTADO = {
    "Confirmada": "En camino",
    "En camino": "En progreso",
    "En progreso": "Finalizada"
};

const ETIQUETA_BOTON = {
    "Confirmada": "Marcar en camino",
    "En camino": "Marcar en progreso",
    "En progreso": "Finalizar visita"
};

async function cargarMisVisitasTecnico() {
    const tabla = document.getElementById("tablaMisVisitasTecnico");

    UI.renderSkeleton(tabla, 7);

    try {
        visitasTecnicoPropias = await apiFetch("/visita-tecnica/tecnico/mis");

        if (visitasTecnicoPropias.length === 0) {
            UI.renderEmptyState(tabla, 7, "Todavía no tenés visitas técnicas asignadas.", "bi-calendar-check");
            return;
        }

        renderTablaMisVisitasTecnico(visitasTecnicoPropias);

    } catch (error) {
        UI.renderErrorRow(tabla, 7, error.message);
    }
}

function renderTablaMisVisitasTecnico(visitas) {
    const tabla = document.getElementById("tablaMisVisitasTecnico");

    tabla.innerHTML = visitas.map(visita => {
        const siguiente = SIGUIENTE_ESTADO[visita.estado];

        return `
        <tr>
            <td data-label="Fecha y hora">${UI.formatearFechaSolo(visita.fecha_solicitada)} · ${(visita.hora_solicitada || "").slice(0, 5)}</td>
            <td data-label="Cliente">${visita.cliente}</td>
            <td data-label="Servicio">${visita.especialidad}</td>
            <td data-label="Dirección">${visita.direccion}</td>
            <td data-label="Estado">${UI.badgeEstadoVisita(visita.estado)}</td>
            <td data-label="Ticket">${visita.id_ticket
                ? `<a href="detalle-ticket.html?id=${visita.id_ticket}" target="_blank">Ver ticket <i class="bi bi-box-arrow-up-right"></i></a>`
                : "—"}</td>
            <td data-label="Acciones">
                <div class="d-flex gap-1 flex-wrap">
                    ${siguiente ? `
                    <button class="btn btn-outline-primary btn-sm" onclick="avanzarEstadoVisita(${visita.id_visita}, '${siguiente}')">
                        ${ETIQUETA_BOTON[visita.estado]}
                    </button>
                    ` : ""}
                    ${["Confirmada", "En camino", "En progreso"].includes(visita.estado) ? `
                    <button class="btn btn-outline-secondary btn-sm" onclick="editarNotasVisita(${visita.id_visita})" title="Agregar observación" aria-label="Agregar observación">
                        <i class="bi bi-chat-left-text"></i>
                    </button>
                    ` : ""}
                    ${!siguiente && !["Finalizada", "Cancelada"].includes(visita.estado) ? `<span class="text-muted small">Esperando confirmación</span>` : ""}
                </div>
            </td>
        </tr>
    `;
    }).join("");
}

// UI.pedirTexto exige texto no vacio (ver ui.js) — no sirve para un dato
// realmente opcional, asi que el avance de estado no pide nada: para dejar
// una observacion esta el boton aparte (editarNotasVisita).
async function avanzarEstadoVisita(id_visita, siguienteEstado) {
    if (siguienteEstado === "Finalizada") {
        const confirmado = await UI.confirmar("¿Marcar esta visita como finalizada?", {
            titulo: "Finalizar visita",
            textoConfirmar: "Sí, finalizar",
            claseConfirmar: "btn-success"
        });

        if (!confirmado) {
            return;
        }
    }

    try {
        await apiFetch(`/visita-tecnica/${id_visita}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: siguienteEstado })
        });

        await cargarMisVisitasTecnico();
        UI.toast(siguienteEstado === "Finalizada" ? "Visita finalizada." : "Visita actualizada.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function editarNotasVisita(id_visita) {
    const visita = visitasTecnicoPropias.find(v => v.id_visita === id_visita);
    if (!visita) return;

    const observaciones = await UI.pedirTexto("Observaciones de esta visita:", {
        titulo: "Observaciones",
        placeholder: visita.observaciones || ""
    });

    if (observaciones === null) {
        return;
    }

    try {
        // resubmite el mismo estado — el endpoint exige uno de los 3 estados
        // validos para el tecnico, no hay una ruta separada solo para notas
        await apiFetch(`/visita-tecnica/${id_visita}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: visita.estado, observaciones })
        });

        await cargarMisVisitasTecnico();
        UI.toast("Observación guardada.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", cargarMisVisitasTecnico);
