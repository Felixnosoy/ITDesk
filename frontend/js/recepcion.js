//========================================
// ITDESK - RECEPCION
//========================================
// Flujo de recepcionista: buscar/crear cliente -> elegir/crear equipo ->
// crear ticket. Cada paso llama directamente a la API real.

let clienteSeleccionado = null;

document.addEventListener("DOMContentLoaded", () => marcarPaso("cliente"));

function marcarPaso(paso) {
    // paso: "cliente" | "equipo" | "ticket"
    const orden = ["cliente", "equipo", "ticket"];
    const indiceActual = orden.indexOf(paso);

    orden.forEach((nombre, indice) => {
        const el = document.getElementById(`step${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`);
        if (!el) {
            return;
        }
        el.classList.remove("active", "done");
        if (indice < indiceActual) {
            el.classList.add("done");
        } else if (indice === indiceActual) {
            el.classList.add("active");
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

async function buscarCliente() {
    const termino = document.getElementById("buscarCliente").value.trim();
    const resultado = document.getElementById("resultadoBusqueda");

    if (!termino) {
        resultado.innerHTML = "";
        return;
    }

    resultado.innerHTML = `<p class="text-muted mb-0"><span class="spinner-border spinner-border-sm"></span> Buscando...</p>`;

    try {
        const usuarios = await apiFetch("/usuarios");
        const clientes = usuarios.filter(u => u.rol === "Cliente");

        const encontrados = Search.filtrar(clientes, termino, [
            "nombre", "apellido", "correo", "telefono", "num_documento",
            u => Codigos.cliente(u)
        ]);

        if (encontrados.length === 0) {
            resultado.innerHTML = `
                <div class="empty-state py-3">
                    <i class="bi bi-person-x"></i>
                    <p class="mb-0">No se encontró ningún cliente con ese dato. Regístralo abajo.</p>
                </div>
            `;
            return;
        }

        resultado.innerHTML = encontrados.map(u => `
            <div class="border rounded-3 p-3 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                    <strong>${u.nombre} ${u.apellido}</strong> <span class="text-muted small">· ${Codigos.cliente(u)}</span>
                    <div class="text-muted small">${u.correo} ${u.telefono ? "· " + u.telefono : ""}</div>
                </div>
                <button class="btn btn-sm btn-success" onclick="elegirClienteEncontrado(${u.id_usuario})">
                    <i class="bi bi-check2"></i> Elegir
                </button>
            </div>
        `).join("");

        window.__clientesEncontrados = encontrados;

    } catch (error) {
        resultado.innerHTML = `<p class="text-danger mb-0">${error.message}</p>`;
    }
}

function elegirClienteEncontrado(id_usuario) {
    const usuario = (window.__clientesEncontrados || []).find(u => u.id_usuario === id_usuario);
    if (usuario) {
        seleccionarCliente(usuario);
    }
}

async function seleccionarCliente(usuario) {
    clienteSeleccionado = usuario;

    // El paso 1 se colapsa: una vez elegido el cliente, el buscador y el
    // formulario completo de alta ya no aportan nada visible — solo
    // scroll extra antes de llegar al paso 2 (Fase 2.5, Hallazgo 9).
    document.getElementById("clienteCardBody").classList.add("d-none");

    document.getElementById("cardClienteSeleccionado").classList.remove("d-none");
    document.getElementById("infoClienteSeleccionado").innerHTML = `
        <strong>${usuario.nombre} ${usuario.apellido}</strong> <span class="text-muted">· ${Codigos.cliente(usuario)}</span>
        <div class="text-muted small">${usuario.correo} ${usuario.telefono ? "· " + usuario.telefono : ""}</div>
    `;

    document.getElementById("cardEquipo").classList.remove("d-none");
    document.getElementById("cardTicket").classList.add("d-none");
    marcarPaso("equipo");

    await cargarEquiposDelCliente();
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
    document.getElementById("resultadoBusqueda").innerHTML = "";
    document.getElementById("selectEquipoExistente").innerHTML = `<option value="">-- Registrar un equipo nuevo --</option>`;
    if (!mantenerAlerta) {
        document.getElementById("alertTicketCreado").classList.add("d-none");
    }
    marcarPaso("cliente");
}

function abrirModalNuevoCliente() {
    document.getElementById("formNuevoCliente").reset();
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
        agregarActividad("bi-pc-display", `${equipo.tipo} ${equipo.marca} ${equipo.modelo}`, `${Codigos.equipo(equipo)} · N.° ${equipo.numero_serie}`);
        document.getElementById("formNuevoEquipo").reset();
        await cargarEquiposDelCliente();

        document.getElementById("selectEquipoExistente").value = equipo.id_equipo;
        document.getElementById("formNuevoEquipo").classList.add("d-none");

        const cardTicket = document.getElementById("cardTicket");
        cardTicket.classList.remove("d-none");
        cardTicket.dataset.idEquipo = equipo.id_equipo;
        marcarPaso("ticket");

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
        alerta.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${Codigos.ticket(ticket)} creado correctamente para ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}.`;
        alerta.scrollIntoView({ behavior: "smooth" });

        agregarActividad("bi-ticket-perforated", `${Codigos.ticket(ticket)} creado`, ticket.titulo);
        document.getElementById("formTicketRecepcion").reset();
        actualizarContadorDescripcion();

        // Listo para el siguiente cliente sin clics manuales — la
        // confirmacion de arriba (alertTicketCreado) queda visible.
        cambiarCliente(true);

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}
