//========================================
// ITDESK - REPORTE: ESTADISTICAS (reporte-estadisticas.html)
//========================================
// Antes era la parte no-tabular de reportes.js: los 3 graficos + la tabla
// "Resumen General", calculados sobre los mismos "tickets"/"usuarios"/
// "encuestas" que el resto de reportes.js pedia para las otras 7 secciones.
// Aca es la unica pagina de las 8 que carga Chart.js.

async function cargarReporteEstadisticas() {
    try {
        const [tickets, usuarios, encuestas] = await Promise.all([
            apiFetch("/ticket"),
            apiFetch("/usuarios"),
            apiFetch("/encuestas").catch(() => [])
        ]);

        const clientes = usuarios.filter(u => u.rol === "Cliente").length;
        const tecnicosActivos = usuarios.filter(u => u.rol === "Tecnico" && u.estado === "Activo").length;
        const abiertos = tickets.filter(t => t.estado === "Abierto").length;
        const cerrados = tickets.filter(t => t.estado === "Cerrado").length;
        const resueltos = tickets.filter(t => t.estado === "Resuelto").length;

        const finalizados = resueltos + cerrados;
        const porcentaje = tickets.length > 0 ? Math.round((finalizados / tickets.length) * 100) : 0;

        document.getElementById("repClientes").textContent = clientes;
        document.getElementById("repTecnicos").textContent = tecnicosActivos;
        document.getElementById("repAbiertos").textContent = abiertos;
        document.getElementById("repCerrados").textContent = cerrados;
        document.getElementById("repPorcentaje").textContent = `${porcentaje}%`;
        document.getElementById("repEncuestas").textContent = encuestas.length;

        document.getElementById("estadisticasActualizado").textContent =
            `Actualizado ${UI.formatearFecha(new Date())} · calculado en vivo sobre ${tickets.length} tickets y ${usuarios.length} usuarios.`;

        renderGraficos(tickets, encuestas);

    } catch (error) {
        document.getElementById("estadisticasActualizado").textContent = "";
        const alerta = document.getElementById("estadisticasError");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${error.message}`;
    }
}

// Los colores se leen una sola vez de los custom properties del tema activo
// al cargar la pagina; si el usuario cambia de tema sin recargar, el
// grafico no se retematiza en caliente (limitacion conocida, no resuelta).
function renderGraficos(tickets, encuestas) {
    if (typeof Chart === "undefined") {
        return;
    }

    const estilos = getComputedStyle(document.documentElement);
    const color = (token) => estilos.getPropertyValue(token).trim();
    const texto = color("--ink-700");
    const borde = color("--border");

    Chart.defaults.color = texto;
    Chart.defaults.borderColor = borde;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

    const porEstado = {
        Abierto: tickets.filter(t => t.estado === "Abierto").length,
        "En proceso": tickets.filter(t => t.estado === "En proceso").length,
        Resuelto: tickets.filter(t => t.estado === "Resuelto").length,
        Cerrado: tickets.filter(t => t.estado === "Cerrado").length
    };
    new Chart(document.getElementById("chartEstado"), {
        type: "doughnut",
        data: {
            labels: Object.keys(porEstado),
            datasets: [{
                data: Object.values(porEstado),
                backgroundColor: [color("--danger"), color("--warning"), color("--success"), color("--info")]
            }]
        },
        options: { plugins: { legend: { position: "bottom" } } }
    });

    const categorias = ["Hardware", "Software", "Red", "Otro"];
    new Chart(document.getElementById("chartCategoria"), {
        type: "bar",
        data: {
            labels: categorias,
            datasets: [{
                label: "Tickets",
                data: categorias.map(cat => tickets.filter(t => t.categoria === cat).length),
                backgroundColor: color("--accent-600")
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });

    new Chart(document.getElementById("chartSatisfaccion"), {
        type: "bar",
        data: {
            labels: ["1 ★", "2 ★", "3 ★", "4 ★", "5 ★"],
            datasets: [{
                label: "Encuestas",
                data: [1, 2, 3, 4, 5].map(n => encuestas.filter(e => e.calificacion === n).length),
                backgroundColor: color("--warning")
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}

document.addEventListener("DOMContentLoaded", cargarReporteEstadisticas);
