//========================================
// ITDESK - ADMIN
//========================================
// Logica de dashboard-admin.html y usuarios.html, conectadas a la API real.

let ticketsAdmin = [];
let usuariosGestion = [];
let idUsuarioResetearClave = null;
let idTicketAsignarActual = null;
let terminoTicketsAdmin = "";
let ordenTicketsAdmin = { campo: null, direccion: "asc" };

// Mismo criterio de urgencia que ya usa la cola del tecnico
// (tecnico.js: ORDEN_ESTADO_COLA / ORDEN_PRIORIDAD_COLA) — que lo primero
// que se ve sea lo que mas necesita asignacion/atencion, no lo mas nuevo.
const ORDEN_ESTADO_ADMIN = { Abierto: 0, "En proceso": 1, Resuelto: 2, Cerrado: 3 };
const ORDEN_PRIORIDAD_ADMIN = { Alta: 0, Media: 1, Baja: 2 };

function ordenarTicketsAdmin(tickets) {
    return [...tickets].sort((a, b) => {
        const porEstado = (ORDEN_ESTADO_ADMIN[a.estado] ?? 9) - (ORDEN_ESTADO_ADMIN[b.estado] ?? 9);
        if (porEstado !== 0) {
            return porEstado;
        }
        return (ORDEN_PRIORIDAD_ADMIN[a.prioridad] ?? 9) - (ORDEN_PRIORIDAD_ADMIN[b.prioridad] ?? 9);
    });
}

// Prioridad/Estado no deben ordenarse alfabeticamente (Alta/Baja/Media
// quedaria mal) — reusan la misma escala de urgencia que ya define el orden
// por defecto de esta tabla, asi los dos criterios quedan consistentes.
const EXTRACTORES_ORDEN_TICKETS_ADMIN = {
    prioridad: t => ORDEN_PRIORIDAD_ADMIN[t.prioridad] ?? 9,
    estado: t => ORDEN_ESTADO_ADMIN[t.estado] ?? 9
};

// Un solo pipeline (filtrar -> ordenar -> paginar) para los dos disparadores
// de esta tabla: la busqueda y un click en un encabezado ordenable. Sin
// orden manual activo, cae al orden por defecto (urgencia real: estado +
// prioridad) en vez de mostrar los tickets en cualquier orden.
function actualizarTablaTicketsAdmin() {
    const filtrados = Search.filtrar(ticketsAdmin, terminoTicketsAdmin, [
        t => `${Codigos.ticket(t)} ${t.id_ticket}`,
        "cliente",
        "cliente_correo",
        "cliente_telefono",
        "equipo_tipo",
        "equipo_marca",
        "equipo_modelo",
        "equipo_numero_serie",
        "equipo_codigo",
        "estado",
        "titulo",
        "categoria"
    ]);

    const datos = ordenTicketsAdmin.campo
        ? Ordenar.aplicar(filtrados, ordenTicketsAdmin.campo, ordenTicketsAdmin.direccion, EXTRACTORES_ORDEN_TICKETS_ADMIN[ordenTicketsAdmin.campo])
        : ordenarTicketsAdmin(filtrados);

    UI.paginarRender(
        datos,
        (visibles) => renderTablaTicketsAdmin(visibles, window.__asignacionActivaPorTicket || {}),
        document.getElementById("verMasTicketsAdmin")
    );
    return datos.length;
}

//========================================
// DASHBOARD-ADMIN: resumen + tickets + asignar tecnico
//========================================

// Microsparkline SVG hecho a mano (sin libreria, Bloque 4 — firma visual
// del administrador) — cuenta los tickets ya cargados en memoria por dia,
// ultimos 7 dias, sin pedir nada nuevo al backend.
function conteoPorDiaUltimos7(tickets, campoFecha) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoy);
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    return dias.map(dia => tickets.filter(t => {
        if (!t[campoFecha]) {
            return false;
        }
        const fecha = new Date(t[campoFecha]);
        return fecha.getFullYear() === dia.getFullYear() &&
            fecha.getMonth() === dia.getMonth() &&
            fecha.getDate() === dia.getDate();
    }).length);
}

function sparklineSvg(valores) {
    const ancho = 60;
    const alto = 20;
    const max = Math.max(...valores, 1);
    const paso = ancho / (valores.length - 1);
    const puntos = valores.map((v, i) => `${(i * paso).toFixed(1)},${(alto - (v / max) * alto).toFixed(1)}`).join(" ");
    return `<svg class="sparkline" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${puntos}"></polyline></svg>`;
}

function renderSparklineKpi(idContenedor, tickets, campoFecha) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) {
        return;
    }
    contenedor.innerHTML = sparklineSvg(conteoPorDiaUltimos7(tickets, campoFecha));
}

async function cargarResumenAdmin() {
    if (!document.getElementById("clientesActivos")) {
        return;
    }

    const tabla = document.getElementById("tablaTicketsAdmin");
    if (tabla) {
        UI.renderSkeleton(tabla, 7);
    }

    let asignaciones = [];
    // null (no []) a proposito: distingue "todavia no se pudo traer" de
    // "se trajo y esta vacio", para que cargarTicketsAdmin sepa si tiene
    // que reintentar el fetch o puede reusar este resultado tal cual.
    let usuarios = null;

    try {
        const [usuariosCargados, asignacionesCargadas] = await Promise.all([
            apiFetch("/usuarios"),
            apiFetch("/asignacion")
        ]);
        usuarios = usuariosCargados;
        asignaciones = asignacionesCargadas;

        // "Clientes Activos": rol Cliente + estado Activo (usuario.estado ya
        // existe, se usa el mismo campo que activar/desactivar en usuarios.html).
        const clientesActivos = usuarios.filter(u => u.rol === "Cliente" && u.estado === "Activo").length;
        UI.contarHasta(document.getElementById("clientesActivos"), clientesActivos);
        UI.contarHasta(document.getElementById("totalTecnicos"), usuarios.filter(u => u.rol === "Tecnico").length);
    } catch (error) {
        console.error(error);
        document.getElementById("clientesActivos").textContent = "—";
        document.getElementById("totalTecnicos").textContent = "—";
    }

    await cargarTicketsAdmin(asignaciones, usuarios);
    cargarActividadReciente(asignaciones);

    Ordenar.conectar(document.getElementById("tablaTicketsAdmin")?.closest("table"), (campo, direccion) => {
        ordenTicketsAdmin = { campo, direccion };
        actualizarTablaTicketsAdmin();
    });

    Search.conectar(document.getElementById("buscarTicketAdmin"), (termino) => {
        terminoTicketsAdmin = termino;
        return actualizarTablaTicketsAdmin();
    }, "resultadosBusquedaTicketAdmin");

    // "Se actualiza automaticamente al crear un ticket": no hay websockets en
    // este proyecto (decision de sesiones anteriores) — mismo criterio que ya
    // usa la campanita de notificaciones (layout.js, poll cada 45s). Si el
    // admin deja la pantalla abierta, Tickets Registrados y Casos Resueltos
    // se refrescan solos sin recargar la pagina. Clientes Activos/Tecnicos no
    // entran en este poll: cambian por gestion de usuarios, no por tickets.
    if (!window.__pollKpisAdmin) {
        window.__pollKpisAdmin = setInterval(() => cargarTicketsAdmin(), 60000);
    }
}

// "Control total": ultimas asignaciones de tecnico, mas recientes primero.
// Recibe las asignaciones ya cargadas por cargarResumenAdmin — evita pedir
// GET /asignacion dos veces en el mismo load de la pantalla.
function cargarActividadReciente(asignaciones) {
    const contenedor = document.getElementById("actividadRecienteAdmin");
    if (!contenedor) {
        return;
    }

    const recientes = [...asignaciones]
        .sort((a, b) => new Date(b.fecha_asignacion) - new Date(a.fecha_asignacion))
        .slice(0, 6);

    if (recientes.length === 0) {
        contenedor.innerHTML = `<p class="text-muted small mb-0">Sin actividad todavía.</p>`;
        return;
    }

    // ticketsAdmin ya trae fecha_apertura de cada ticket (cargarTicketsAdmin
    // corre antes que esto en cargarResumenAdmin) — se usa para el codigo
    // sin pedir nada nuevo al backend.
    const ticketsPorId = new Map(ticketsAdmin.map(t => [t.id_ticket, t]));

    contenedor.innerHTML = recientes.map(a => {
        const ticket = ticketsPorId.get(a.id_ticket);
        // sin el ticket completo no hay fecha_apertura para armar el codigo
        // real (Codigos.ticket lo necesita) — en vez de inventar una fecha
        // sustituta, se muestra el id crudo pero SIN pintarlo como si fuera
        // un codigo real (sin clase .codigo), para no mentir el formato.
        const referencia = ticket ? `<span class="codigo">${Codigos.ticket(ticket)}</span>` : `ticket #${a.id_ticket}`;
        return `
            <div class="d-flex align-items-start gap-2 pb-2 mb-2 border-bottom">
                <i class="bi bi-person-check-fill text-primary mt-1"></i>
                <div>
                    <div class="small fw-semibold">${a.tecnico} <span class="text-muted fw-normal">→ ${referencia}</span></div>
                    <div class="small text-muted">${UI.formatearFecha(a.fecha_asignacion)}</div>
                </div>
            </div>
        `;
    }).join("");
}

// usuariosCache: cuando cargarResumenAdmin ya trajo /usuarios en su propia
// carga, lo pasa aca para no pedirlo dos veces en el mismo load de la
// pantalla (mismo criterio que ya se aplicaba a /asignacion, ver el
// comentario de cargarActividadReciente). En la llamada independiente
// (ej. tras asignarTecnico) no llega nada y se pide fresco, como siempre.
async function cargarTicketsAdmin(asignaciones, usuariosCache = null) {
    const tabla = document.getElementById("tablaTicketsAdmin");
    if (!tabla) {
        return;
    }

    if (asignaciones === undefined) {
        // llamada independiente (ej. tras asignarTecnico) — no viene de
        // cargarResumenAdmin, asi que aca si hace falta pedirlas.
        UI.renderSkeleton(tabla, 7);
        asignaciones = await apiFetch("/asignacion").catch(() => []);
    }

    try {
        const [tickets, usuarios, equipos] = await Promise.all([
            apiFetch("/ticket"),
            usuariosCache || apiFetch("/usuarios"),
            apiFetch("/equipo").catch(() => [])
        ]);

        if (document.getElementById("totalTickets")) {
            UI.contarHasta(document.getElementById("totalTickets"), tickets.length);
            renderSparklineKpi("sparkTickets", tickets, "fecha_apertura");
        }
        if (document.getElementById("porcentajeResueltos")) {
            // (Resueltos / Total) x 100, 1 decimal como maximo — 0% si no hay
            // tickets, division por cero evitada a proposito.
            const resueltos = tickets.filter(t => t.estado === "Resuelto" || t.estado === "Cerrado").length;
            const porcentaje = tickets.length ? Math.round((resueltos / tickets.length) * 1000) / 10 : 0;
            UI.contarHasta(document.getElementById("porcentajeResueltos"), porcentaje, { formatear: UI.formatearPorcentaje });
        }

        if (tickets.length === 0) {
            UI.renderEmptyState(tabla, 7, "Todavía no hay tickets registrados.", "bi-ticket-perforated");
            ticketsAdmin = [];
            return;
        }

        const usuariosPorId = new Map(usuarios.map(u => [u.id_usuario, u]));
        const equiposPorId = new Map(equipos.map(e => [e.id_equipo, e]));
        const tecnicos = usuarios.filter(u => u.rol === "Tecnico");
        window.__tecnicosAdmin = tecnicos;

        // carga activa por tecnico, para repartir asignaciones de forma
        // balanceada en vez de a ciegas (dato ya viene en "asignaciones").
        const cargaPorTecnico = asignaciones
            .filter(a => a.activa)
            .reduce((acc, a) => {
                acc[a.id_usuario] = (acc[a.id_usuario] || 0) + 1;
                return acc;
            }, {});
        window.__cargaTecnicosAdmin = cargaPorTecnico;

        // idem, pero indexado por ticket: permite saber si un ticket ya
        // tiene tecnico (para reasignar via PUT en vez de POST — ver
        // asignarTecnico) sin pedir nada nuevo al backend.
        const asignacionActivaPorTicket = {};
        asignaciones.filter(a => a.activa).forEach(a => {
            asignacionActivaPorTicket[a.id_ticket] = a;
        });
        window.__asignacionActivaPorTicket = asignacionActivaPorTicket;

        ticketsAdmin = tickets.map(t => {
            const equipo = equiposPorId.get(t.id_equipo);
            return {
                ...t,
                cliente_correo: usuariosPorId.get(t.id_usuario)?.correo || "",
                cliente_telefono: usuariosPorId.get(t.id_usuario)?.telefono || "",
                equipo_codigo: equipo ? Codigos.equipo(equipo) : ""
            };
        });

        actualizarTablaTicketsAdmin();

    } catch (error) {
        UI.renderErrorRow(tabla, 7, error.message);
    }
}

function renderTablaTicketsAdmin(ordenados, asignacionActivaPorTicket = {}) {
    const tabla = document.getElementById("tablaTicketsAdmin");

    if (ordenados.length === 0) {
        UI.renderEmptyState(tabla, 7, "Ningún ticket coincide con la búsqueda.", "bi-search");
        return;
    }

    tabla.innerHTML = ordenados.map(ticket => {
        // Prioridad/Categoria/Estado competian como 3 badges de color en la
        // misma fila (Bloque 5) — prioridad pasa a la banda de 3px que ya
        // usa la cola del tecnico (ticket-fila-prioridad-*, ver tecnico.js),
        // categoria a texto simple sin color ni icono, y solo estado se
        // queda como badge (un badge por fila, no tres).
        if (ticket.estado === "Cerrado") {
            return `
                <tr class="ticket-fila-prioridad-${ticket.prioridad}">
                    <td data-label="ID"><a href="detalle-ticket.html?id=${ticket.id_ticket}" class="codigo">${Codigos.ticket(ticket)}</a></td>
                    <td data-label="Cliente">${ticket.cliente}</td>
                    <td data-label="Equipo">${ticket.equipo_tipo} ${ticket.equipo_marca}</td>
                    <td data-label="Título">${ticket.titulo}</td>
                    <td data-label="Categoría">${ticket.categoria}</td>
                    <td data-label="Estado">${UI.badgeEstado(ticket.estado)}</td>
                    <td data-label="Especialista">—</td>
                </tr>
            `;
        }

        // si el ticket ya tiene un especialista sugerido, se muestra su
        // nombre + un boton chico de "Cambiar"; si no, un unico boton
        // "Asignar" — la eleccion real del tecnico pasa al modal
        // (abrirModalAsignarTecnico), no a un <select> apretado adentro de
        // la celda. Esto es solo una etiqueta: no restringe a otros
        // tecnicos de trabajar en el mismo ticket.
        const activa = asignacionActivaPorTicket[ticket.id_ticket];

        // btn-outline en los dos casos (antes "Asignar" era btn-primary
        // solido, repetido en cada fila) — el relleno solido se reserva
        // para la accion primaria de la pantalla, que no es una accion por
        // fila (Bloque 5).
        const accion = activa
            ? `
                <div class="small mb-1"><i class="bi bi-person-check-fill text-success"></i> ${activa.tecnico}</div>
                <button class="btn btn-outline-secondary btn-sm" onclick="abrirModalAsignarTecnico(${ticket.id_ticket})">
                    <i class="bi bi-arrow-repeat"></i> Cambiar
                </button>
            `
            : `
                <button class="btn btn-outline-primary btn-sm" onclick="abrirModalAsignarTecnico(${ticket.id_ticket})">
                    <i class="bi bi-person-plus-fill"></i> Asignar
                </button>
            `;

        return `
            <tr class="ticket-fila-prioridad-${ticket.prioridad}">
                <td data-label="ID"><a href="detalle-ticket.html?id=${ticket.id_ticket}">${Codigos.ticket(ticket)}</a></td>
                <td data-label="Cliente">${ticket.cliente}</td>
                <td data-label="Equipo">${ticket.equipo_tipo} ${ticket.equipo_marca}</td>
                <td data-label="Título">${ticket.titulo}</td>
                <td data-label="Categoría">${ticket.categoria}</td>
                <td data-label="Estado">${UI.badgeEstado(ticket.estado)}</td>
                <td data-label="Especialista">${accion}</td>
            </tr>
        `;
    }).join("");
}

// Abre el modal con el contexto del ticket + la lista de tecnicos como
// filas grandes clickeables (reemplaza el <select> apretado que vivia
// adentro de la celda de la tabla).
function abrirModalAsignarTecnico(id_ticket) {
    const ticket = ticketsAdmin.find(t => t.id_ticket === id_ticket);
    const tecnicos = window.__tecnicosAdmin || [];
    const cargaPorTecnico = window.__cargaTecnicosAdmin || {};
    const activa = (window.__asignacionActivaPorTicket || {})[id_ticket];

    if (!ticket) {
        return;
    }

    idTicketAsignarActual = id_ticket;

    document.getElementById("asignarTicketInfo").innerHTML = `
        <div><strong class="codigo">${Codigos.ticket(ticket)}</strong> — ${ticket.titulo}</div>
        <div class="text-muted">${ticket.cliente} · ${ticket.equipo_tipo} ${ticket.equipo_marca}</div>
        ${activa ? `<div class="mt-1"><i class="bi bi-person-check-fill text-success"></i> Actualmente: ${activa.tecnico}</div>` : ""}
    `;

    const lista = document.getElementById("listaTecnicosAsignar");

    if (tecnicos.length === 0) {
        lista.innerHTML = `<p class="text-muted small mb-0">No hay técnicos registrados.</p>`;
    } else {
        lista.innerHTML = tecnicos.map(t => {
            const carga = cargaPorTecnico[t.id_usuario] || 0;
            const etiquetaCarga = carga === 0 ? "Sin asignaciones" : `${carga} activo${carga === 1 ? "" : "s"}`;
            const tonoCarga = carga === 0 ? "success" : carga <= 2 ? "neutral" : "warning";
            const seleccionado = activa && activa.id_usuario === t.id_usuario;
            return `
                <label class="tecnico-pick">
                    <input type="radio" name="tecnicoAsignar" value="${t.id_usuario}" ${seleccionado ? "checked" : ""}>
                    <span class="tecnico-pick-info">
                        <span class="tecnico-pick-nombre">${t.nombre} ${t.apellido}</span>
                        <span class="badge-pill tone-${tonoCarga}">${etiquetaCarga}</span>
                    </span>
                </label>
            `;
        }).join("");
    }

    const modal = new bootstrap.Modal(document.getElementById("modalAsignarTecnico"));
    modal.show();
}

async function confirmarAsignacion(event) {
    const seleccionado = document.querySelector('input[name="tecnicoAsignar"]:checked');

    if (!seleccionado) {
        UI.toast("Elige un técnico primero.", "warning");
        return;
    }

    const id_ticket = idTicketAsignarActual;
    const id_usuario = seleccionado.value;
    const activa = (window.__asignacionActivaPorTicket || {})[id_ticket];
    const ticket = ticketsAdmin.find(t => t.id_ticket === id_ticket);

    try {
        await UI.conCargando(event.currentTarget, activa ? "Reasignando..." : "Asignando...", async () => {
            if (activa) {
                // reasignar = editar en el lugar la asignacion activa
                // existente (PUT), no crear una nueva — POST /asignacion
                // rechaza con 409 si el ticket ya tiene una activa.
                await apiFetch(`/asignacion/${activa.id_asignacion}`, {
                    method: "PUT",
                    body: JSON.stringify({ id_usuario: Number(id_usuario), activa: true })
                });
            } else {
                await apiFetch("/asignacion", {
                    method: "POST",
                    body: JSON.stringify({ id_ticket, id_usuario: Number(id_usuario) })
                });
            }

            // el ticket pasa a "En proceso" solo la primera vez (estaba
            // "Abierto") — reasignar uno ya Resuelto no debe regresarlo.
            if (ticket?.estado === "Abierto") {
                await apiFetch(`/ticket/${id_ticket}/estado`, {
                    method: "PATCH",
                    body: JSON.stringify({ estado: "En proceso" })
                });
            }
        });

        bootstrap.Modal.getInstance(document.getElementById("modalAsignarTecnico"))?.hide();
        UI.toast(activa ? "Especialista actualizado correctamente." : "Especialista asignado. El ticket pasó a En proceso.");

        // aviso al tecnico — nunca debe bloquear ni romper la asignacion en si
        if (ticket) {
            apiFetch("/notificacion", {
                method: "POST",
                body: JSON.stringify({
                    id_ticket,
                    id_usuario: Number(id_usuario),
                    tipo: "Asignación",
                    mensaje: `Te marcaron como especialista del ticket ${Codigos.ticket(ticket)}: ${ticket.titulo}`
                })
            }).catch(() => {});
        }

        // aviso al cliente, solo la primera vez (mismo criterio que el PATCH
        // de estado de arriba: reasignar un ticket que ya estaba en proceso
        // no es una novedad para el cliente).
        if (ticket && ticket.estado === "Abierto") {
            apiFetch("/notificacion", {
                method: "POST",
                body: JSON.stringify({
                    id_ticket,
                    id_usuario: ticket.id_usuario,
                    tipo: "Estado",
                    mensaje: `Tu ticket ${Codigos.ticket(ticket)} ya tiene un técnico trabajando en él — pasó a "En proceso".`
                })
            }).catch(() => {});
        }

        await cargarTicketsAdmin();

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

//========================================
// USUARIOS.HTML: listar / buscar / crear / eliminar
//========================================
async function cargarUsuariosGestion() {
    const tabla = document.getElementById("tablaUsuarios");
    if (!tabla) {
        return;
    }

    UI.renderSkeleton(tabla, 6);

    try {
        usuariosGestion = await apiFetch("/usuarios");

        if (usuariosGestion.length === 0) {
            UI.renderEmptyState(tabla, 6, "Todavía no hay usuarios registrados.", "bi-people");
            return;
        }

        const contenedorBoton = document.getElementById("verMasUsuarios");
        let terminoActual = "";

        // busqueda y orden pasan por el mismo pipeline: filtrar -> ordenar
        // -> paginar. Asi un click en un encabezado respeta la busqueda
        // activa, y una busqueda nueva respeta el orden activo.
        const orden = Ordenar.conectar(tabla.closest("table"), () => actualizar());

        const actualizar = () => {
            let datos = Search.filtrar(usuariosGestion, terminoActual, [
                "nombre",
                "apellido",
                "correo",
                "rol",
                u => u.rol === "Cliente" ? Codigos.cliente(u) : ""
            ]);
            datos = Ordenar.aplicar(datos, orden.campo, orden.direccion);
            UI.paginarRender(datos, renderTablaUsuarios, contenedorBoton);
            return datos.length;
        };

        actualizar();

        Search.conectar(document.getElementById("buscarUsuario"), (termino) => {
            terminoActual = termino;
            return actualizar();
        }, "resultadosBusquedaUsuarios");

    } catch (error) {
        UI.renderErrorRow(tabla, 6, error.message);
    }
}

function renderTablaUsuarios(usuarios) {
    const tabla = document.getElementById("tablaUsuarios");

    if (usuarios.length === 0) {
        UI.renderEmptyState(tabla, 6, "Ningún usuario coincide con la búsqueda.", "bi-people");
        return;
    }

    tabla.innerHTML = usuarios.map(usuario => `
        <tr>
            <td data-label="Código">${usuario.rol === "Cliente" ? Codigos.cliente(usuario) : "—"}</td>
            <td data-label="Nombre">${usuario.nombre} ${usuario.apellido}</td>
            <td data-label="Correo">${usuario.correo}</td>
            <td data-label="Rol">${UI.badgeRol(usuario.rol)}</td>
            <td data-label="Estado">${UI.badgeEstadoUsuario(usuario.estado)}</td>
            <td data-label="Acciones">
                <button class="btn btn-outline-secondary btn-sm" onclick="alternarEstadoUsuario(${usuario.id_usuario}, '${usuario.estado}')"
                    title="${usuario.estado === "Activo" ? "Desactivar" : "Activar"} usuario" aria-label="${usuario.estado === "Activo" ? "Desactivar" : "Activar"} usuario">
                    <i class="bi ${usuario.estado === "Activo" ? "bi-slash-circle" : "bi-check-circle"}"></i>
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="abrirModalResetearClave(${usuario.id_usuario}, '${(usuario.nombre + " " + usuario.apellido).replace(/'/g, "\\'")}')"
                    title="Resetear contraseña" aria-label="Resetear contraseña">
                    <i class="bi bi-key"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="eliminarUsuarioAdmin(${usuario.id_usuario})"
                    title="Eliminar usuario" aria-label="Eliminar usuario">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join("");
}

function abrirModalCrearUsuario() {
    document.getElementById("formCrearUsuario").reset();
    const modal = new bootstrap.Modal(document.getElementById("modalCrear"));
    modal.show();
}

async function crearUsuarioAdmin(event) {
    event.preventDefault();

    const datos = {
        nombre: document.getElementById("crearNombre").value.trim(),
        apellido: document.getElementById("crearApellido").value.trim(),
        correo: document.getElementById("crearCorreo").value.trim(),
        telefono: document.getElementById("crearTelefono").value.trim(),
        tipo_documento: "Cedula",
        num_documento: document.getElementById("crearNumDocumento").value.trim(),
        "contraseña": document.getElementById("crearPassword").value,
        rol: document.getElementById("crearRol").value,
        estado: "Activo"
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Creando...", () => apiFetch("/usuarios", {
            method: "POST",
            body: JSON.stringify(datos)
        }));

        bootstrap.Modal.getInstance(document.getElementById("modalCrear")).hide();
        await cargarUsuariosGestion();
        UI.toast("Usuario creado correctamente.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function alternarEstadoUsuario(id_usuario, estadoActual) {
    const activar = estadoActual !== "Activo";
    const nuevoEstado = activar ? "Activo" : "Inactivo";

    const confirmado = await UI.confirmar(
        activar
            ? "¿Activar este usuario? Podrá volver a iniciar sesión."
            : "¿Desactivar este usuario? No podrá iniciar sesión hasta que se reactive.",
        {
            titulo: activar ? "Activar usuario" : "Desactivar usuario",
            textoConfirmar: activar ? "Sí, activar" : "Sí, desactivar",
            claseConfirmar: activar ? "btn-success" : "btn-danger"
        }
    );

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch(`/usuarios/${id_usuario}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: nuevoEstado })
        });
        await cargarUsuariosGestion();
        UI.toast(activar ? "Usuario activado." : "Usuario desactivado.");
    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

function abrirModalResetearClave(id_usuario, nombreCompleto) {
    idUsuarioResetearClave = id_usuario;
    document.getElementById("formResetearClave").reset();
    document.getElementById("resetearClaveUsuarioNombre").textContent = `Usuario: ${nombreCompleto}`;
    const modal = new bootstrap.Modal(document.getElementById("modalResetearClave"));
    modal.show();
}

async function resetearClaveUsuario(event) {
    event.preventDefault();

    const nueva = document.getElementById("resetearClaveNueva").value;
    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Guardando...", () => apiFetch(`/usuarios/${idUsuarioResetearClave}/clave/reset`, {
            method: "PATCH",
            body: JSON.stringify({ "contraseñaNueva": nueva })
        }));

        bootstrap.Modal.getInstance(document.getElementById("modalResetearClave")).hide();
        UI.toast("Contraseña reseteada correctamente.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function eliminarUsuarioAdmin(id_usuario) {
    const confirmado = await UI.confirmar("¿Eliminar este usuario? Esta acción no se puede deshacer.", {
        titulo: "Eliminar usuario",
        textoConfirmar: "Sí, eliminar"
    });

    if (!confirmado) {
        return;
    }

    try {
        await apiFetch(`/usuarios/${id_usuario}`, { method: "DELETE" });
        await cargarUsuariosGestion();
        UI.toast("Usuario eliminado correctamente.");
    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarResumenAdmin();
    cargarUsuariosGestion();

    // .card-stat-clickable usa role="button" (es un <div>, no un <a>/<button>)
    // — Enter/Espacio no la activan solos, hace falta cablearlo a mano.
    document.querySelectorAll(".card-stat-clickable[role='button']").forEach(tarjeta => {
        tarjeta.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                tarjeta.click();
            }
        });
    });
});
