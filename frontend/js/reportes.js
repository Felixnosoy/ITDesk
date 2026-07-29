//========================================
// ITDESK - REPORTES (reportes.html)
//========================================
// Todo calculado en vivo con GET /ticket + GET /usuarios (ya disponibles
// para Administrador). No hay endpoint de reportes agregados en la API.

async function cargarReportes() {
    try {
        const [tickets, usuarios, encuestas] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/usuarios"),
            apiFetch("/encuestas").catch(() => [])
        ]);

        const enProceso = tickets.filter(t => t.estado === "En proceso").length;
        const resueltos = tickets.filter(t => t.estado === "Resuelto").length;
        const abiertos = tickets.filter(t => t.estado === "Abierto").length;
        const cerrados = tickets.filter(t => t.estado === "Cerrado").length;
        const clientes = usuarios.filter(u => u.rol === "Cliente").length;
        const tecnicosActivos = usuarios.filter(u => u.rol === "Tecnico" && u.estado === "Activo").length;

        const finalizados = resueltos + cerrados;
        const porcentaje = tickets.length > 0 ? Math.round((finalizados / tickets.length) * 100) : 0;

        const promedioSatisfaccion = encuestas.length > 0
            ? (encuestas.reduce((suma, e) => suma + e.calificacion, 0) / encuestas.length)
            : null;

        document.getElementById("repTotalTickets").textContent = tickets.length;
        document.getElementById("repTicketsProceso").textContent = enProceso;
        document.getElementById("repTicketsResueltos").textContent = resueltos;
        document.getElementById("repClientes").textContent = clientes;
        document.getElementById("repTecnicos").textContent = tecnicosActivos;
        document.getElementById("repAbiertos").textContent = abiertos;
        document.getElementById("repCerrados").textContent = cerrados;
        document.getElementById("repPorcentaje").textContent = `${porcentaje}%`;
        document.getElementById("repEncuestas").textContent = encuestas.length;

        document.getElementById("repSatisfaccion").textContent =
            promedioSatisfaccion !== null ? `${promedioSatisfaccion.toFixed(1)} / 5` : "—";
        document.getElementById("repSatisfaccionSub").textContent =
            encuestas.length > 0 ? `${encuestas.length} encuesta${encuestas.length === 1 ? "" : "s"}` : "Sin encuestas todavía";

        document.getElementById("reportesActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · calculado en vivo sobre ${tickets.length} tickets y ${usuarios.length} usuarios.`;

    } catch (error) {
        document.getElementById("reportesActualizado").textContent = "";
        const alerta = document.getElementById("reportesError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

document.addEventListener("DOMContentLoaded", cargarReportes);
