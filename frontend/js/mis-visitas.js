//========================================
// ITDESK - MIS VISITAS TECNICAS (Cliente)
//========================================

let visitasCliente = [];

const ESTADOS_CANCELABLES_CLIENTE = ["Pendiente", "Confirmada"];

async function cargarMisVisitas() {
    const tabla = document.getElementById("tablaMisVisitas");

    UI.renderSkeleton(tabla, 6);

    try {
        visitasCliente = await apiFetch("/visita-tecnica/mis");

        if (visitasCliente.length === 0) {
            UI.renderEmptyState(tabla, 6, "Todavía no solicitaste ninguna visita técnica.", "bi-calendar-check");
            return;
        }

        renderTablaMisVisitas(visitasCliente);

    } catch (error) {
        UI.renderErrorRow(tabla, 6, error.message);
    }
}

function renderTablaMisVisitas(visitas) {
    const tabla = document.getElementById("tablaMisVisitas");

    tabla.innerHTML = visitas.map(visita => `
        <tr>
            <td data-label="Fecha y hora">${UI.formatearFechaCorta(visita.fecha_solicitada)} · ${(visita.hora_solicitada || "").slice(0, 5)}</td>
            <td data-label="Servicio">${visita.especialidad}</td>
            <td data-label="Estado">${UI.badgeEstadoVisita(visita.estado)}</td>
            <td data-label="Técnico">${visita.tecnico || "Sin asignar todavía"}</td>
            <td data-label="Dirección">${visita.direccion}</td>
            <td data-label="Acciones">
                ${ESTADOS_CANCELABLES_CLIENTE.includes(visita.estado) ? `
                <button class="btn btn-outline-danger btn-sm" onclick="cancelarVisitaPropia(${visita.id_visita})"
                    title="Cancelar visita" aria-label="Cancelar visita">
                    <i class="bi bi-x-circle"></i> Cancelar
                </button>
                ` : "—"}
            </td>
        </tr>
    `).join("");
}

async function cancelarVisitaPropia(id_visita) {
    const motivo = await UI.pedirTexto("¿Por qué querés cancelar esta visita? (opcional)", {
        titulo: "Cancelar visita técnica",
        placeholder: "Ej: ya lo resolví por mi cuenta"
    });

    if (motivo === null) {
        return;
    }

    try {
        await apiFetch(`/visita-tecnica/${id_visita}/cancelar`, {
            method: "PATCH",
            body: JSON.stringify({ motivo })
        });

        await cargarMisVisitas();
        UI.toast("Visita cancelada.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarMisVisitas();

    if (sessionStorage.getItem("avisoVisitaSolicitada")) {
        sessionStorage.removeItem("avisoVisitaSolicitada");
        UI.toast("Visita solicitada correctamente. Te confirmarán la fecha y el técnico a la brevedad.");
    }
});
