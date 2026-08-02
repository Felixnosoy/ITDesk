//========================================
// ITDESK - LANDING (index.html)
//========================================
// Unica pantalla publica del sistema (sin data-protegido, sin auth.js) — la
// seccion "Estadisticas" pide GET /estadisticas/publicas, el unico endpoint
// del backend que no exige token (backend/src/routes/estadisticas.routes.js),
// y que solo devuelve 4 conteos agregados, nunca una fila individual.

async function cargarEstadisticasPublicas() {
    const valorTickets = document.getElementById("landingTickets");
    if (!valorTickets) {
        return;
    }

    try {
        const stats = await apiFetch("/estadisticas/publicas");

        UI.contarHasta(valorTickets, stats.tickets_registrados);
        UI.contarHasta(document.getElementById("landingClientes"), stats.clientes_activos);
        UI.contarHasta(document.getElementById("landingTecnicos"), stats.tecnicos_especializados);
        UI.contarHasta(document.getElementById("landingResueltos"), stats.porcentaje_resueltos, {
            formatear: UI.formatearPorcentaje
        });
    } catch (error) {
        // pantalla publica, sin sesion: si el backend no responde, se queda
        // en los valores estaticos del HTML (0/0/0/0%) en vez de mostrarle
        // un error a un visitante anonimo.
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", cargarEstadisticasPublicas);
