//========================================
// ITDESK - REPORTES: INDICE (reportes.html)
//========================================
// Antes esta pagina cargaba las 8 secciones de reporte de una — ahora cada
// una vive en su propia pagina (reporte-tickets.html, etc.) con su propio
// fetch. Esta pantalla solo pinta la tira de KPIs y la rejilla de accesos,
// asi que solo pide /ticket + /encuestas (lo minimo para esos 4 numeros),
// no los 8 endpoints que pedia el reportes.js viejo.

async function cargarReportes() {
    try {
        const [tickets, encuestas] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/encuestas").catch(() => [])
        ]);

        const enProceso = tickets.filter(t => t.estado === "En proceso").length;
        const resueltos = tickets.filter(t => t.estado === "Resuelto").length;

        const promedioSatisfaccion = encuestas.length > 0
            ? (encuestas.reduce((suma, e) => suma + e.calificacion, 0) / encuestas.length)
            : null;

        document.getElementById("repTotalTickets").textContent = tickets.length;
        document.getElementById("repTicketsProceso").textContent = enProceso;
        document.getElementById("repTicketsResueltos").textContent = resueltos;

        document.getElementById("repSatisfaccion").textContent =
            promedioSatisfaccion !== null ? `${promedioSatisfaccion.toFixed(1)} / 5` : "—";
        document.getElementById("repSatisfaccionSub").textContent =
            encuestas.length > 0 ? `${encuestas.length} encuesta${encuestas.length === 1 ? "" : "s"}` : "Sin encuestas todavía";

        document.getElementById("reportesActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · calculado en vivo sobre ${tickets.length} tickets.`;

    } catch (error) {
        document.getElementById("reportesActualizado").textContent = "";
        const alerta = document.getElementById("reportesError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

document.addEventListener("DOMContentLoaded", cargarReportes);
