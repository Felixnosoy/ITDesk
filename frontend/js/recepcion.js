//========================================
// ITDESK - RECEPCION
//========================================
// Flujo de recepcionista: buscar/crear cliente -> elegir/crear equipo ->
// crear ticket. Cada paso llama directamente a la API real.

let clienteSeleccionado = null;

// Cache de clientes: se pide una sola vez al entrar (no en cada busqueda,
// que era lo que hacia el buscador viejo — un GET /usuarios completo por
// cada Enter/click en Buscar) y se actualiza en el momento si se registra
// un cliente nuevo desde el modal, sin volver a pedir nada.
let clientesCache = [];
let clientesFiltradosTypeahead = [];
let indiceResaltadoTypeahead = -1;

document.addEventListener("DOMContentLoaded", () => {
    marcarPaso("cliente");
    cargarClientesCache();
    inicializarTypeahead();
});

async function cargarClientesCache() {
    try {
        const usuarios = await apiFetch("/usuarios");
        clientesCache = usuarios.filter(u => u.rol === "Cliente");
    } catch (error) {
        clientesCache = [];
    }
}

// Atajos Alt+1/2/3: saltan directo al campo principal del paso correspondiente
// (solo si ese paso ya esta visible) — reduce clicks en un flujo de captura
// rapida donde la recepcionista repite esto decenas de veces por turno.
const ATAJOS_PASO = {
    "1": ["cardCliente", "buscarCliente"],
    "2": ["cardEquipo", "selectEquipoExistente"],
    "3": ["cardTicket", "tkTitulo"]
};

document.addEventListener("keydown", (evento) => {
    if (!evento.altKey) {
        return;
    }
    const objetivo = ATAJOS_PASO[evento.key];
    if (!objetivo) {
        return;
    }
    const [idCard, idCampo] = objetivo;
    const card = document.getElementById(idCard);
    if (card && !card.classList.contains("d-none")) {
        evento.preventDefault();
        document.getElementById(idCampo)?.focus();
    }
});

function marcarPaso(paso) {
    // paso: "cliente" | "equipo" | "ticket"
    const orden = ["cliente", "equipo", "ticket"];
    const indiceActual = orden.indexOf(paso);

    orden.forEach((nombre, indice) => {
        const capitalizado = `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`;

        const el = document.getElementById(`step${capitalizado}`);
        if (el) {
            el.classList.remove("active", "done");
            if (indice < indiceActual) {
                el.classList.add("done");
            } else if (indice === indiceActual) {
                el.classList.add("active");
            }
        }

        // Misma logica sobre la card del paso — asi el paso activo se nota
        // en la tarjeta misma (no solo en el circulo de arriba) y los pasos
        // ya completados se ven visualmente "cerrados" en vez de quedar
        // apiladas tres cards con el mismo peso visual.
        const card = document.getElementById(`card${capitalizado}`);
        if (card) {
            card.classList.remove("is-active", "is-done");
            if (indice < indiceActual) {
                card.classList.add("is-done");
            } else if (indice === indiceActual) {
                card.classList.add("is-active");
            }
        }
    });
}

// Panel "Actividad reciente": solo lo que se registro en esta sesion del
// navegador (no persiste, no llama a la API para historizarlo — es memoria
// del propio flujo, no una funcionalidad nueva del backend).
function agregarActividad(icono, texto, sub) {
    const lista = document.getElementById("listaActividadReciente");
    if (!lista) {
        return;
    }

    if (lista.querySelector(".empty-state")) {
        lista.innerHTML = "";
    }

    const item = document.createElement("div");
    item.className = "d-flex align-items-start gap-2 pb-2 mb-2 border-bottom";
    item.innerHTML = `
        <i class="bi ${icono} text-primary mt-1"></i>
        <div>
            <div class="small fw-semibold">${texto}</div>
            <div class="small text-muted">${sub}</div>
        </div>
    `;
    lista.prepend(item);
}

function actualizarContadorDescripcion() {
    const campo = document.getElementById("tkDescripcion");
    const contador = document.getElementById("contadorDescripcion");
    if (campo && contador) {
        contador.textContent = campo.value.length;
    }
}

// Typeahead del buscador de cliente — combobox accesible (role=combobox en
// el input, role=listbox/option en el panel, aria-activedescendant sigue al
// highlight de teclado). Busca en clientesCache, ya cargado: cada tecla
// solo filtra en memoria, no pide nada a la API (Search.conectar ya trae su
// propio debounce de 250ms, no hace falta reimplementarlo aca).

function resaltarCoincidencia(texto, termino) {
    const indice = texto.toLowerCase().indexOf(termino.toLowerCase());
    if (indice === -1) {
        return texto;
    }
    return `${texto.slice(0, indice)}<mark>${texto.slice(indice, indice + termino.length)}</mark>${texto.slice(indice + termino.length)}`;
}

// Decide a que campo del modal "cliente nuevo" mandar lo que ya se escribio
// en el buscador — solo digitos (con o sin guiones) -> documento, con
// arroba -> correo, cualquier otra cosa -> nombre.
function tipoDePrefijo(texto) {
    if (/^[\d-]+$/.test(texto)) {
        return "documento";
    }
    if (texto.includes("@")) {
        return "correo";
    }
    return "nombre";
}

function renderTypeahead(termino) {
    const panel = document.getElementById("listaClientesTypeahead");
    const input = document.getElementById("buscarCliente");
    indiceResaltadoTypeahead = -1;

    if (!termino) {
        cerrarTypeahead();
        return 0;
    }

    clientesFiltradosTypeahead = Search.filtrar(clientesCache, termino, [
        "nombre", "apellido", "correo", "telefono", "num_documento",
        u => Codigos.cliente(u)
    ]).slice(0, 8);

    const filasClientes = clientesFiltradosTypeahead.map((u, indice) => `
        <button type="button" class="typeahead-item" id="typeaheadItem${indice}" role="option" data-id="${u.id_usuario}">
            <strong>${resaltarCoincidencia(`${u.nombre} ${u.apellido}`, termino)}</strong>
            <span class="text-muted small">· <span class="codigo">${Codigos.cliente(u)}</span></span>
            <div class="text-muted small">${u.correo}${u.telefono ? " · " + u.telefono : ""}</div>
        </button>
    `).join("");

    const sinResultados = clientesFiltradosTypeahead.length === 0
        ? `<div class="p-3 text-muted small">Ningún cliente coincide con "${termino}".</div>`
        : "";

    const filaNueva = `
        <button type="button" class="typeahead-item typeahead-item-nuevo" id="typeaheadItemNuevo" role="option" data-nuevo="1">
            <i class="bi bi-person-plus-fill"></i> Registrar "${termino}" como cliente nuevo
        </button>
    `;

    panel.innerHTML = filasClientes + sinResultados + filaNueva;
    panel.classList.remove("d-none");
    input.setAttribute("aria-expanded", "true");

    panel.querySelectorAll(".typeahead-item").forEach(item => {
        item.addEventListener("click", () => {
            if (item.dataset.nuevo) {
                cerrarTypeahead();
                abrirModalNuevoCliente(termino);
            } else {
                elegirClienteTypeahead(Number(item.dataset.id));
            }
        });
    });

    return clientesFiltradosTypeahead.length;
}

function cerrarTypeahead() {
    const panel = document.getElementById("listaClientesTypeahead");
    const input = document.getElementById("buscarCliente");
    panel.classList.add("d-none");
    panel.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    indiceResaltadoTypeahead = -1;
}

function elegirClienteTypeahead(id_usuario) {
    const usuario = clientesCache.find(u => u.id_usuario === id_usuario);
    cerrarTypeahead();
    document.getElementById("buscarCliente").value = "";
    if (usuario) {
        seleccionarCliente(usuario);
    }
}

function marcarResaltadoTypeahead(items) {
    const input = document.getElementById("buscarCliente");
    items.forEach((item, indice) => item.classList.toggle("resaltado", indice === indiceResaltadoTypeahead));

    const activo = items[indiceResaltadoTypeahead];
    if (activo) {
        activo.scrollIntoView({ block: "nearest" });
        input.setAttribute("aria-activedescendant", activo.id);
    } else {
        input.removeAttribute("aria-activedescendant");
    }
}

function manejarTecladoTypeahead(evento) {
    const panel = document.getElementById("listaClientesTypeahead");
    if (panel.classList.contains("d-none")) {
        return;
    }

    const items = [...panel.querySelectorAll(".typeahead-item")];
    if (items.length === 0) {
        return;
    }

    if (evento.key === "ArrowDown") {
        evento.preventDefault();
        indiceResaltadoTypeahead = Math.min(indiceResaltadoTypeahead + 1, items.length - 1);
        marcarResaltadoTypeahead(items);
    } else if (evento.key === "ArrowUp") {
        evento.preventDefault();
        indiceResaltadoTypeahead = Math.max(indiceResaltadoTypeahead - 1, 0);
        marcarResaltadoTypeahead(items);
    } else if (evento.key === "Enter") {
        if (indiceResaltadoTypeahead >= 0) {
            evento.preventDefault();
            items[indiceResaltadoTypeahead].click();
        }
    } else if (evento.key === "Escape") {
        cerrarTypeahead();
    }
}

function inicializarTypeahead() {
    const input = document.getElementById("buscarCliente");
    if (!input) {
        return;
    }

    Search.conectar(input, (termino) => renderTypeahead(termino.trim()), "resultadosBusquedaCliente");
    input.addEventListener("keydown", manejarTecladoTypeahead);

    document.addEventListener("click", (evento) => {
        const panel = document.getElementById("listaClientesTypeahead");
        if (!panel.classList.contains("d-none") && !panel.contains(evento.target) && evento.target !== input) {
            cerrarTypeahead();
        }
    });
}

async function seleccionarCliente(usuario) {
    clienteSeleccionado = usuario;

    // El paso 1 se colapsa: una vez elegido el cliente, el buscador y el
    // formulario completo de alta ya no aportan nada visible — solo
    // scroll extra antes de llegar al paso 2 (Fase 2.5, Hallazgo 9).
    document.getElementById("clienteCardBody").classList.add("d-none");

    document.getElementById("cardClienteSeleccionado").classList.remove("d-none");
    document.getElementById("infoClienteSeleccionado").innerHTML = `
        <strong>${usuario.nombre} ${usuario.apellido}</strong> <span class="text-muted">· <span class="codigo">${Codigos.cliente(usuario)}</span></span>
        <div class="text-muted small">${usuario.correo} ${usuario.telefono ? "· " + usuario.telefono : ""}</div>
    `;

    document.getElementById("cardEquipo").classList.remove("d-none");
    document.getElementById("cardTicket").classList.add("d-none");
    marcarPaso("equipo");

    await cargarEquiposDelCliente();
    document.getElementById("selectEquipoExistente")?.focus();
}

// mantenerAlerta: true cuando el reset es automatico tras crear un ticket
// (crearTicketRecepcion) — ahi la confirmacion "Ticket #X creado" debe
// seguir visible mientras el flujo ya esta listo para el proximo cliente.
function cambiarCliente(mantenerAlerta = false) {
    clienteSeleccionado = null;
    document.getElementById("clienteCardBody").classList.remove("d-none");
    document.getElementById("cardClienteSeleccionado").classList.add("d-none");
    document.getElementById("cardEquipo").classList.add("d-none");
    document.getElementById("cardTicket").classList.add("d-none");
    document.getElementById("buscarCliente").value = "";
    cerrarTypeahead();
    document.getElementById("selectEquipoExistente").innerHTML = `<option value="">-- Registrar un equipo nuevo --</option>`;
    if (!mantenerAlerta) {
        document.getElementById("alertTicketCreado").classList.add("d-none");
    }
    marcarPaso("cliente");
}

// prefill: lo que la recepcionista ya escribio en el buscador, si abrio el
// modal desde la opcion "Registrar cliente nuevo" del typeahead — se
// precarga en el campo que corresponda para no hacerla escribir 2 veces.
function abrirModalNuevoCliente(prefill) {
    document.getElementById("formNuevoCliente").reset();

    if (prefill) {
        const tipo = tipoDePrefijo(prefill);
        if (tipo === "documento") {
            document.getElementById("ncNumDocumento").value = prefill;
        } else if (tipo === "correo") {
            document.getElementById("ncCorreo").value = prefill;
        } else {
            const [primero, ...resto] = prefill.trim().split(/\s+/);
            document.getElementById("ncNombre").value = primero || "";
            document.getElementById("ncApellido").value = resto.join(" ");
        }
    }

    const modal = new bootstrap.Modal(document.getElementById("modalNuevoCliente"));
    modal.show();
}

// Alta de cliente: accion independiente, fuera del flujo de crear ticket.
// Nunca se encadena con seleccionarCliente() — crear un ticket sigue siendo
// siempre buscar y elegir, el recepcionista no "atajos" hacia el paso 2
// tipeando datos. Para usar al cliente recien creado, se lo busca despues
// como a cualquier otro (por nombre, correo o su codigo).
async function crearClienteRecepcion(event) {
    event.preventDefault();

    const datos = {
        nombre: document.getElementById("ncNombre").value.trim(),
        apellido: document.getElementById("ncApellido").value.trim(),
        correo: document.getElementById("ncCorreo").value.trim(),
        telefono: document.getElementById("ncTelefono").value.trim(),
        tipo_documento: document.getElementById("ncTipoDocumento").value,
        num_documento: document.getElementById("ncNumDocumento").value.trim(),
        "contraseña": document.getElementById("ncPassword").value,
        rol: "Cliente",
        estado: "Activo"
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        const usuario = await UI.conCargando(boton, "Registrando...", () => apiFetch("/usuarios", {
            method: "POST",
            body: JSON.stringify(datos)
        }));

        bootstrap.Modal.getInstance(document.getElementById("modalNuevoCliente")).hide();
        document.getElementById("formNuevoCliente").reset();
        clientesCache.push(usuario);
        UI.toast(`Cliente registrado: ${Codigos.cliente(usuario)}. Búscalo arriba para crear su ticket.`);
        agregarActividad("bi-person-plus-fill", `${usuario.nombre} ${usuario.apellido}`, `Cliente nuevo · ${Codigos.cliente(usuario)}`);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function cargarEquiposDelCliente() {
    const select = document.getElementById("selectEquipoExistente");
    select.innerHTML = `<option value="">-- Registrar un equipo nuevo --</option>`;

    try {
        const equipos = await apiFetch(`/equipo/usuario/${clienteSeleccionado.id_usuario}`);
        equipos.forEach(equipo => {
            const option = document.createElement("option");
            option.value = equipo.id_equipo;
            option.textContent = `${equipo.tipo} ${equipo.marca} ${equipo.modelo} (${equipo.numero_serie}) · ${Codigos.equipo(equipo)}`;
            select.appendChild(option);
        });
    } catch (error) {
        // el cliente puede no tener equipos registrados todavia, no es un error
    }
}

function seleccionarEquipoExistente() {
    const id = document.getElementById("selectEquipoExistente").value;
    const formNuevo = document.getElementById("formNuevoEquipo");
    const cardTicket = document.getElementById("cardTicket");

    if (id) {
        formNuevo.classList.add("d-none");
        cardTicket.classList.remove("d-none");
        cardTicket.dataset.idEquipo = id;
        marcarPaso("ticket");
        document.getElementById("tkTitulo")?.focus();
    } else {
        formNuevo.classList.remove("d-none");
        cardTicket.classList.add("d-none");
        delete cardTicket.dataset.idEquipo;
        marcarPaso("equipo");
    }
}

async function crearEquipoRecepcion(event) {
    event.preventDefault();

    const datos = {
        id_usuario: clienteSeleccionado.id_usuario,
        tipo: document.getElementById("eqTipo").value,
        marca: document.getElementById("eqMarca").value.trim(),
        modelo: document.getElementById("eqModelo").value.trim(),
        numero_serie: document.getElementById("eqSerie").value.trim(),
        estado: document.getElementById("eqEstado").value,
        observaciones: document.getElementById("eqObservaciones").value.trim()
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        const equipo = await UI.conCargando(boton, "Registrando...", () => apiFetch("/equipo", {
            method: "POST",
            body: JSON.stringify(datos)
        }));

        UI.toast("Equipo registrado correctamente.");
        agregarActividad("bi-pc-display", `${equipo.tipo} ${equipo.marca} ${equipo.modelo}`, `<span class="codigo">${Codigos.equipo(equipo)}</span> · N.° ${equipo.numero_serie}`);
        document.getElementById("formNuevoEquipo").reset();
        await cargarEquiposDelCliente();

        document.getElementById("selectEquipoExistente").value = equipo.id_equipo;
        document.getElementById("formNuevoEquipo").classList.add("d-none");

        const cardTicket = document.getElementById("cardTicket");
        cardTicket.classList.remove("d-none");
        cardTicket.dataset.idEquipo = equipo.id_equipo;
        marcarPaso("ticket");
        document.getElementById("tkTitulo")?.focus();

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function crearTicketRecepcion(event) {
    event.preventDefault();

    const idEquipo = document.getElementById("cardTicket").dataset.idEquipo;

    if (!idEquipo) {
        UI.toast("Selecciona o registra un equipo primero.", "warning");
        return;
    }

    const datos = {
        id_usuario: clienteSeleccionado.id_usuario,
        id_equipo: Number(idEquipo),
        titulo: document.getElementById("tkTitulo").value.trim(),
        descripcion: document.getElementById("tkDescripcion").value.trim(),
        prioridad: document.getElementById("tkPrioridad").value,
        categoria: document.getElementById("tkCategoria").value
    };

    const boton = event.target.querySelector("button[type=submit]");

    try {
        const ticket = await UI.conCargando(boton, "Creando...", () => apiFetch("/ticket", {
            method: "POST",
            body: JSON.stringify(datos)
        }));

        const alerta = document.getElementById("alertTicketCreado");
        alerta.classList.remove("d-none");
        alerta.innerHTML = `<i class="bi bi-check-circle-fill"></i> <span class="codigo">${Codigos.ticket(ticket)}</span> creado correctamente para ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}.`;
        alerta.scrollIntoView({ behavior: "smooth" });

        agregarActividad("bi-ticket-perforated", `<span class="codigo">${Codigos.ticket(ticket)}</span> creado`, ticket.titulo);

        // Aviso al cliente de que su ticket ya quedo registrado — nunca debe
        // bloquear el flujo de recepcion si falla (mismo patron fire-and-forget
        // que notificarCliente en ticket-tecnico.js).
        apiFetch("/notificacion", {
            method: "POST",
            body: JSON.stringify({
                id_ticket: ticket.id_ticket,
                id_usuario: ticket.id_usuario,
                tipo: "Registro",
                mensaje: `Tu ticket ${Codigos.ticket(ticket)} fue registrado: ${ticket.titulo}.`
            })
        }).catch(() => {});

        document.getElementById("formTicketRecepcion").reset();
        actualizarContadorDescripcion();

        // Listo para el siguiente cliente sin clics manuales — la
        // confirmacion de arriba (alertTicketCreado) queda visible.
        cambiarCliente(true);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}
