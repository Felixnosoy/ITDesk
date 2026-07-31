//========================================
// ITDESK - AUDITORIA
//========================================
// Registro de acciones clave, de solo lectura (Admin/Tecnico). Las entradas
// se generan en el backend en el momento de cada accion (ver
// auditoriaService.registrarEvento en los controllers de ticket, usuario,
// asignacion, cotizacion, factura y archivo) — esta pantalla solo lista lo
// que ya existe, nunca escribe nada.

let auditoriaEventos = [];
let terminoAuditoria = "";
let ordenAuditoria = { campo: null, direccion: "asc" };

const ICONO_POR_ACCION = {
    TICKET_CREADO: "bi-ticket-perforated-fill",
    TICKET_CERRADO: "bi-lock-fill",
    TICKET_ASIGNADO: "bi-person-check-fill",
    TICKET_REASIGNADO: "bi-arrow-repeat",
    USUARIO_CREADO: "bi-person-plus-fill",
    USUARIO_ACTIVADO: "bi-check-circle-fill",
    USUARIO_DESACTIVADO: "bi-slash-circle",
    CLAVE_RESETEADA: "bi-key-fill",
    COTIZACION_APROBADA: "bi-check2-circle",
    COTIZACION_RECHAZADA: "bi-x-circle",
    FACTURA_PAGADA: "bi-receipt",
    FACTURA_VENCIDA: "bi-clock-history",
    FACTURA_ANULADA: "bi-x-circle",
    ARCHIVO_ELIMINADO: "bi-trash",
    TICKET_CALIFICADO: "bi-star-fill",
    TICKET_RESUELTO_SIN_COSTO: "bi-gift-fill"
};

async function cargarAuditoria() {
    const tabla = document.getElementById("tablaAuditoria");
    if (!tabla) {
        return;
    }

    UI.renderSkeleton(tabla, 4);

    try {
        auditoriaEventos = await apiFetch("/auditoria");

        if (auditoriaEventos.length === 0) {
            UI.renderEmptyState(tabla, 4, "Todavía no hay eventos registrados.", "bi-clipboard-data");
            return;
        }

        poblarFiltrosAuditoria();
        actualizarTablaAuditoria();

        Search.conectar(document.getElementById("buscarAuditoria"), (termino) => {
            terminoAuditoria = termino;
            return actualizarTablaAuditoria();
        }, "resultadosBusquedaAuditoria");

    } catch (error) {
        UI.renderErrorRow(tabla, 4, error.message);
    }
}

// codigoDeEvento: igual que Codigos.ticket(), pero tolera eventos sin
// ticket asociado (LEFT JOIN en el backend puede traer fecha_apertura null).
function codigoDeEvento(e) {
    return e.id_ticket && e.fecha_apertura ? Codigos.ticket({ id_ticket: e.id_ticket, fecha_apertura: e.fecha_apertura }) : "";
}

function poblarFiltrosAuditoria() {
    const selUsuario = document.getElementById("filtroUsuarioAuditoria");
    const usuarios = [...new Set(auditoriaEventos.map(e => e.usuario))].sort();
    selUsuario.innerHTML = `<option value="">Todos</option>` +
        usuarios.map(u => `<option value="${u}">${u}</option>`).join("");

    const selAccion = document.getElementById("filtroAccionAuditoria");
    selAccion.innerHTML = `<option value="">Todas</option>` +
        Object.keys(ICONO_POR_ACCION).map(a => `<option value="${a}">${a}</option>`).join("");
}

// Sin orden manual activo, el mas nuevo primero (ya viene asi del backend,
// ORDER BY id_auditoria DESC) — un click en un encabezado lo reemplaza.
function actualizarTablaAuditoria() {
    const usuario = document.getElementById("filtroUsuarioAuditoria")?.value || "";
    const accion = document.getElementById("filtroAccionAuditoria")?.value || "";
    const desde = document.getElementById("filtroDesdeAuditoria")?.value || "";
    const hasta = document.getElementById("filtroHastaAuditoria")?.value || "";

    const base = auditoriaEventos.filter(e => {
        if (usuario && e.usuario !== usuario) {
            return false;
        }
        if (accion && e.accion !== accion) {
            return false;
        }
        if (desde && new Date(e.fecha) < new Date(`${desde}T00:00:00`)) {
            return false;
        }
        if (hasta && new Date(e.fecha) > new Date(`${hasta}T23:59:59`)) {
            return false;
        }
        return true;
    });

    const filtrados = Search.filtrar(base, terminoAuditoria, [
        "usuario",
        "rol",
        "accion",
        "descripcion",
        e => codigoDeEvento(e)
    ]);

    const datos = ordenAuditoria.campo
        ? Ordenar.aplicar(filtrados, ordenAuditoria.campo, ordenAuditoria.direccion)
        : filtrados;

    UI.paginarRender(datos, renderTablaAuditoria, document.getElementById("verMasAuditoria"));
    return datos.length;
}

function renderTablaAuditoria(eventos) {
    const tabla = document.getElementById("tablaAuditoria");

    if (eventos.length === 0) {
        UI.renderEmptyState(tabla, 4, "Ningún evento coincide con la búsqueda.", "bi-search");
        return;
    }

    tabla.innerHTML = eventos.map(e => `
        <tr>
            <td data-label="Fecha"><small class="text-muted">${UI.formatearFecha(e.fecha)}</small></td>
            <td data-label="Usuario">
                <div class="small fw-semibold">${e.usuario}</div>
                ${UI.badgeRol(e.rol)}
            </td>
            <td data-label="Descripción">
                <i class="bi ${ICONO_POR_ACCION[e.accion] || "bi-info-circle"}"></i> ${e.descripcion}
            </td>
            <td data-label="Ticket">
                ${codigoDeEvento(e) ? `
                    <a href="detalle-ticket.html?id=${e.id_ticket}" class="codigo">${codigoDeEvento(e)}</a>
                    ${e.ticket_titulo ? `<div class="small text-muted text-truncate" style="max-width:180px;">${e.ticket_titulo}</div>` : ""}
                ` : "—"}
            </td>
        </tr>
    `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    cargarAuditoria();

    Ordenar.conectar(document.getElementById("tablaAuditoria")?.closest("table"), (campo, direccion) => {
        ordenAuditoria = { campo, direccion };
        actualizarTablaAuditoria();
    });

    ["filtroUsuarioAuditoria", "filtroAccionAuditoria", "filtroDesdeAuditoria", "filtroHastaAuditoria"]
        .forEach(id => document.getElementById(id)?.addEventListener("change", actualizarTablaAuditoria));

    document.getElementById("btnLimpiarFiltrosAuditoria")?.addEventListener("click", () => {
        document.getElementById("filtroUsuarioAuditoria").value = "";
        document.getElementById("filtroAccionAuditoria").value = "";
        document.getElementById("filtroDesdeAuditoria").value = "";
        document.getElementById("filtroHastaAuditoria").value = "";
        actualizarTablaAuditoria();
    });

    const usuario = Auth.getUsuario();
    const inicio = document.getElementById("breadcrumbInicio");
    if (inicio && usuario && typeof NAV_POR_ROL !== "undefined" && NAV_POR_ROL[usuario.rol]) {
        inicio.href = NAV_POR_ROL[usuario.rol].marca.href;
    }
});
