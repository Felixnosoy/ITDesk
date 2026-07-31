//========================================
// ITDESK - LOGIN (login.html)
//========================================
// Unica pantalla que todavia depende de este archivo: el resto de la logica
// vive en su propio JS por rol (admin.js, tecnico.js, cliente.js,
// recepcion.js, ticket-tecnico.js, ticket-cliente.js, perfil.js, historial.js,
// reportes.js). El nav/footer/logout/proteccion de pagina vive en layout.js.

const DESTINO_POR_ROL = {
    Administrador: "dashboard-admin.html",
    Tecnico: "dashboard-tecnico.html",
    Cliente: "dashboard-cliente.html",
    Recepcionista: "dashboard-recepcion.html"
};

// Si llegamos aca por un 401 (sesion vencida) o por requerirRol (rol sin
// permiso), Auth dejo el motivo en sessionStorage antes de redirigir —
// se muestra una sola vez y se limpia.
document.addEventListener("DOMContentLoaded", () => {
    const motivo = sessionStorage.getItem("motivoLogout");
    if (!motivo) {
        return;
    }
    sessionStorage.removeItem("motivoLogout");

    const mensajes = {
        expirada: "Tu sesión expiró. Inicia sesión de nuevo para continuar.",
        "sin-permiso": "No tienes permiso para acceder a esa página."
    };

    const aviso = document.getElementById("avisoSesion");
    if (aviso) {
        aviso.textContent = mensajes[motivo] || "Inicia sesión de nuevo para continuar.";
        aviso.classList.remove("d-none");
    }
});

async function iniciarSesion(event) {
    event.preventDefault();

    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;

    const boton = event.target.querySelector("button[type=submit]");

    try {
        const data = await UI.conCargando(boton, "Ingresando...", () => apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ correo, contraseña: password })
        }));

        Auth.guardarSesion(data.token, data.usuario);

        const destino = DESTINO_POR_ROL[data.usuario.rol];
        if (!destino) {
            throw new Error("Tu usuario no tiene un rol válido para acceder al sistema.");
        }

        window.location.href = destino;

    } catch (error) {
        UI.toast(error.message, "danger");
    }
}
