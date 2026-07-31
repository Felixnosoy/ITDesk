//========================================
// ITDESK - REPORTES: HELPERS COMPARTIDOS
//========================================
// Funciones que usa mas de una de las 8 paginas de reporte (antes vivian
// una sola vez en el reportes.js monolitico). Se carga antes del script
// propio de cada pagina.

// "YYYY-MM-DD" (formato nativo de <input type=date>) a "DD/MM/YYYY" sin pasar
// por new Date(): un date-only string se interpreta en UTC, y formatearlo
// con metodos de horario local puede correr el dia mostrado (Republica
// Dominicana es UTC-4) — esto solo reordena los digitos tal cual los eligio
// el usuario, sin conversion de zona horaria de por medio.
function formatearFechaInputCorta(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

// Los 7 reportes imprimibles arman el mismo trio (generadoPor/generadoFecha/
// generadoHora) para el encabezado del documento — antes se repetia igual en
// cada funcion imprimirReporteX().
function metaImpresion() {
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    return {
        generadoPor: usuario ? `${usuario.nombre} ${usuario.apellido || ""} (${usuario.rol})`.trim() : "Administrador",
        generadoFecha: UI.formatearFechaCorta(new Date()),
        generadoHora: new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true })
    };
}
