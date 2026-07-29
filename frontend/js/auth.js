//========================================
// ITDESK - AUTH
//========================================
// Maneja la sesion del usuario actual. Se guarda en sessionStorage (no
// localStorage) a proposito: sessionStorage es por pestaña, asi que abrir
// varias pestañas del mismo navegador permite tener una sesion distinta en
// cada una (ej. Admin en una, Tecnico en otra) para revisar el flujo
// completo del sistema sin que una sesion pise a la otra. La forma de
// "usuario" es igual a lo que devuelve el backend:
// { id_usuario, nombre, apellido, correo, rol, estado }.

const Auth = {

    getToken() {
        return sessionStorage.getItem("token");
    },

    getUsuario() {
        const usuario = sessionStorage.getItem("usuario");
        return usuario ? JSON.parse(usuario) : null;
    },

    getRol() {
        const usuario = this.getUsuario();
        return usuario ? usuario.rol : null;
    },

    estaAutenticado() {
        return Boolean(this.getUsuario());
    },

    guardarSesion(token, usuario) {
        if (token) {
            sessionStorage.setItem("token", token);
        }
        sessionStorage.setItem("usuario", JSON.stringify(usuario));
    },

    logout() {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");
        window.location.href = "login.html";
    },

    // 401 de la API (token invalido o vencido): limpia la sesion y deja un
    // aviso para que login.html lo muestre, en vez de dejar al usuario
    // viendo un mensaje de error crudo en la pantalla en la que estaba.
    cerrarPorSesionVencida() {
        sessionStorage.setItem("motivoLogout", "expirada");
        this.logout();
    },

    // Exige sesion activa y, si se indican roles, que el rol actual este
    // entre los permitidos. Si no cumple, redirige a login y devuelve null.
    requerirRol(...rolesPermitidos) {
        if (!this.estaAutenticado()) {
            window.location.href = "login.html";
            return null;
        }

        const rol = this.getRol();

        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(rol)) {
            sessionStorage.setItem("motivoLogout", "sin-permiso");
            window.location.href = "login.html";
            return null;
        }

        return this.getUsuario();
    }
};
