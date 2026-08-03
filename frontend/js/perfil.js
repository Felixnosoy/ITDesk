//========================================
// ITDESK - PERFIL (compartido por los 4 roles)
//========================================
// GET /usuarios/:id ahora tambien deja pasar a cualquier usuario para SU
// PROPIA cuenta (antes era solo Administrador/Tecnico/Recepcionista), asi
// que los 4 roles piden el registro completo de la misma forma.

let idUsuarioActual = null;
let especialidadesTecnicasActual = "";

async function cargarPerfil() {
    const usuario = Auth.getUsuario();
    if (!usuario) {
        return;
    }

    idUsuarioActual = usuario.id_usuario;

    document.getElementById("perfilNombre").textContent = `${usuario.nombre} ${usuario.apellido || ""}`.trim();
    document.getElementById("perfilRol").innerHTML = UI.badgeRol(usuario.rol);
    // mismo avatar de iniciales que ya arma el sidebar (funcion global de
    // layout.js), no un icono generico aparte (Fase 2.5, Hallazgo 4)
    document.getElementById("perfilAvatar").textContent = iniciales(usuario.nombre, usuario.apellido);

    const inicio = document.getElementById("breadcrumbInicio");
    if (inicio && typeof NAV_POR_ROL !== "undefined" && NAV_POR_ROL[usuario.rol]) {
        inicio.href = NAV_POR_ROL[usuario.rol].marca.href;
    }

    try {
        const completo = await apiFetch(`/usuarios/${usuario.id_usuario}`);

        // catalogo estructurado de especialidades (distinto del campo de
        // texto libre "especialidad") — solo lectura acá, se gestiona desde
        // Usuarios (Administrador)
        if (completo.rol === "Tecnico") {
            try {
                const propias = await apiFetch(`/usuarios/${usuario.id_usuario}/especialidades`);
                especialidadesTecnicasActual = propias.map(e => e.nombre).join(", ");
            } catch (error) {
                // si falla, simplemente no se muestra la fila — no bloquea el resto del perfil
            }
        }

        renderDatos({
            correo: completo.correo,
            telefono: completo.telefono,
            direccion: completo.direccion,
            especialidad: completo.especialidad,
            especialidades_tecnicas: especialidadesTecnicasActual,
            num_documento: completo.num_documento,
            estado: completo.estado,
            fecha_registro: UI.formatearFechaCorta(completo.fecha_registro)
        });
        precargarFormularioPerfil(completo);
    } catch (error) {
        renderDatos({ correo: usuario.correo, estado: usuario.estado });
        document.getElementById("perfilAviso").classList.remove("d-none");
    }
}

function precargarFormularioPerfil(datos) {
    document.getElementById("editarTelefono").value = datos.telefono || "";
    document.getElementById("editarDireccion").value = datos.direccion || "";
}

const ETIQUETAS = {
    correo: "Correo",
    telefono: "Teléfono",
    direccion: "Dirección",
    especialidad: "Especialidad",
    especialidades_tecnicas: "Especialidades técnicas",
    num_documento: "N.° Documento",
    estado: "Estado",
    fecha_registro: "Miembro desde"
};

function renderDatos(datos) {
    const el = document.getElementById("perfilDatos");

    el.innerHTML = Object.entries(datos)
        .filter(([, valor]) => valor)
        .map(([clave, valor]) => `
            <dt class="col-5">${ETIQUETAS[clave] || clave}</dt>
            <dd class="col-7">${valor}</dd>
        `).join("");
}

async function guardarPerfilPropio(event) {
    event.preventDefault();

    const telefono = document.getElementById("editarTelefono").value.trim();
    const direccion = document.getElementById("editarDireccion").value.trim();
    const boton = event.target.querySelector("button[type=submit]");

    try {
        const actualizado = await UI.conCargando(boton, "Guardando...", () => apiFetch(`/usuarios/${idUsuarioActual}/perfil`, {
            method: "PATCH",
            body: JSON.stringify({ telefono, direccion })
        }));

        renderDatos({
            correo: actualizado.correo,
            telefono: actualizado.telefono,
            direccion: actualizado.direccion,
            especialidad: actualizado.especialidad,
            especialidades_tecnicas: especialidadesTecnicasActual,
            num_documento: actualizado.num_documento,
            estado: actualizado.estado,
            fecha_registro: UI.formatearFechaCorta(actualizado.fecha_registro)
        });
        document.getElementById("perfilAviso").classList.add("d-none");

        UI.toast("Perfil actualizado correctamente.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

async function cambiarClavePropia(event) {
    event.preventDefault();

    const usuario = Auth.getUsuario();
    const actual = document.getElementById("claveActual").value;
    const nueva = document.getElementById("claveNueva").value;
    const confirmar = document.getElementById("claveNuevaConfirmar").value;

    if (nueva !== confirmar) {
        UI.toast("La confirmación no coincide con la contraseña nueva.", "danger");
        return;
    }

    const boton = event.target.querySelector("button[type=submit]");

    try {
        await UI.conCargando(boton, "Guardando...", () => apiFetch(`/usuarios/${usuario.id_usuario}/clave`, {
            method: "PATCH",
            body: JSON.stringify({ "contraseñaActual": actual, "contraseñaNueva": nueva })
        }));

        document.getElementById("formCambiarClave").reset();
        UI.toast("Contraseña actualizada correctamente.");

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}

document.addEventListener("DOMContentLoaded", cargarPerfil);
