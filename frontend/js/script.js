//========================================
// ITDESK
//========================================
//========================================
// REGISTRO DE USUARIOS
//========================================
function registrarUsuario(event) {

    event.preventDefault();

    let nombre = document.getElementById("nombre").value.trim();
    let apellido = document.getElementById("apellido").value.trim();
    let correo = document.getElementById("correo").value.trim();
    let telefono = document.getElementById("telefono").value.trim();
    let departamento = document.getElementById("departamento").value;
    let usuario = document.getElementById("usuario").value.trim();
    let password = document.getElementById("password").value;
    let confirmar = document.getElementById("confirmar").value;

    if (
        nombre == "" ||
        apellido == "" ||
        correo == "" ||
        telefono == "" ||
        departamento == "" ||
        usuario == "" ||
        password == ""
    ) {

        alert("Complete todos los campos.");

        return;

    }

    if (password !== confirmar) {

        alert("Las contraseñas no coinciden.");

        return;

    }

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    let existe = usuarios.find(u => u.usuario.toLowerCase() === usuario.toLowerCase());

    if (existe) {

        alert("Ese nombre de usuario ya existe.");

        return;

    }

    let nuevoUsuario = {

        id: Date.now(),

        nombre: nombre,

        apellido: apellido,

        correo: correo,

        telefono: telefono,

        departamento: departamento,

        usuario: usuario,

        password: password,

        rol: "cliente",

        estado: "Activo",

        fechaRegistro: new Date().toLocaleDateString()

    };

    usuarios.push(nuevoUsuario);

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    alert("Usuario registrado correctamente.");

    window.location.href = "login.html";

}
//========================================
// LOGIN
//========================================
function iniciarSesion(event) {
    event.preventDefault();
    let usuario = document.getElementById("usuario").value.trim();
    let password = document.getElementById("password").value;
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    // Administrador fijo
    if (usuario === "admin" && password === "admin123") {
        localStorage.setItem("usuario", "Administrador");
        localStorage.setItem("rol", "admin");
        window.location.href = "dashboard-admin.html";
        return;
    }
    // Técnico fijo
    if (usuario === "tecnico" && password === "tec123") {
        localStorage.setItem("usuario", "Técnico");
        localStorage.setItem("rol", "tecnico");
        window.location.href = "dashboard-tecnico.html";
        return;
    }
    // Clientes registrados
    let cliente = usuarios.find(u =>
        u.usuario === usuario &&
        u.password === password
    );
    if (cliente) {
        localStorage.setItem("usuario", cliente.nombre);
        localStorage.setItem("rol", "cliente");
        window.location.href = "dashboard-cliente.html";
    }
    else {
        alert("Usuario o contraseña incorrectos.");
    }
}
//========================================
// Mostrar nombre del usuario
//========================================
window.onload = function () {
    let nombre = localStorage.getItem("usuario");
    if (document.getElementById("nombreUsuario")) {
        document.getElementById("nombreUsuario").innerHTML = nombre;
    }
    if (document.getElementById("nombreTecnico")) {
        document.getElementById("nombreTecnico").innerHTML = nombre;
    }
    if (document.getElementById("nombreAdmin")) {
        document.getElementById("nombreAdmin").innerHTML = nombre;
    }
    let cliente = document.getElementById("cliente");
    if (cliente) {
        cliente.value = nombre;
    }
    cargarTicketsCliente();
    cargarUsuarios();
    cargarDetalleTicket();
}
//========================================
// Mostrar campo "Otro Departamento"
//========================================
function mostrarOtroDepartamento() {
    let departamento = document.getElementById("departamento").value;
    let campo = document.getElementById("otroDepartamentoDiv");
    if (departamento === "Otro") {
        campo.style.display = "block";
    } else {
        campo.style.display = "none";
    }
}
//========================================
// Mostrar campo "Otro Equipo"
//========================================
function mostrarOtroEquipo() {
    let equipo = document.getElementById("tipoEquipo").value;
    let campo = document.getElementById("otroEquipoDiv");
    if (equipo === "Otro") {
        campo.style.display = "block";
    } else {
        campo.style.display = "none";
    }
}
//========================================
// Confirmación para cerrar sesión
//========================================
function cerrarSesion() {
    if (confirm("¿Desea cerrar la sesión?")) {
        localStorage.clear();
        window.location.href = "login.html";
    }
}
function registrarTicket(event) {
    event.preventDefault();
    let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
    let departamento = document.getElementById("departamento").value;
    if (departamento === "Otro") {
        departamento = document.getElementById("otroDepartamento").value;
    }
    let equipo = document.getElementById("tipoEquipo").value;
    if (equipo === "Otro") {
        equipo = document.getElementById("otroEquipo").value;
    }
    let ticket = {
        id: "TCK-" + Date.now(),
        cliente: localStorage.getItem("usuario"),
        equipo: equipo,
        departamento: departamento,
        descripcion: document.getElementById("descripcion").value,
        estado: "Pendiente",
        tecnico: "Sin asignar",
        observaciones: "",
        solucion: ""
    };
    tickets.push(ticket);
    localStorage.setItem("tickets", JSON.stringify(tickets));
    alert("El ticket fue registrado correctamente.");
    window.location.href = "dashboard-cliente.html";
}
function cargarTicketsCliente() {
    let usuario = localStorage.getItem("usuario");
    let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
    let tabla = document.getElementById("tablaTickets");
    if (!tabla) {
        return;
    }
    tabla.innerHTML = "";
    let total = 0;
    let proceso = 0;
    let resueltos = 0;
    tickets.forEach(ticket => {
        if (ticket.cliente === usuario) {
            total++;
            if (ticket.estado === "En proceso") {
                proceso++;
            }
            if (ticket.estado === "Resuelto") {
                resueltos++;
            }
            tabla.innerHTML += `
<tr>
    <td>${ticket.id}</td>
    <td>${ticket.equipo}</td>
    <td>
        <span class="badge bg-primary">
            ${ticket.estado}
        </span>
    </td>
    <td>${ticket.tecnico}</td>
    <td>
        <button class="btn btn-primary btn-sm">
            Ver
        </button>
    </td>
</tr>
`;
        }
    });
    if (document.getElementById("totalTickets")) {
        document.getElementById("totalTickets").textContent = total;
    }
    if (document.getElementById("ticketsProceso")) {
        document.getElementById("ticketsProceso").textContent = proceso;
    }
    if (document.getElementById("ticketsResueltos")) {
        document.getElementById("ticketsResueltos").textContent = resueltos;
    }
}
function cargarTicketsTecnico() {
    let usuario = localStorage.getItem("usuario");
    let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
    let tabla = document.getElementById("tablaTecnico");
    if (!tabla) return;
    tabla.innerHTML = "";
    tickets.forEach(ticket => {
        if (ticket.tecnico === usuario) {
            tabla.innerHTML += `
            <tr>
                <td>${ticket.id}</td>
                <td>${ticket.cliente}</td>
                <td>${ticket.equipo}</td>
                <td>${ticket.estado}</td>
                <td>
                    <button
class="btn btn-primary btn-sm"
onclick="abrirTicket('${ticket.id}')">
Abrir
</button>
                </td>
            </tr>
            `;
        }
    });
}
//========================================
// DASHBOARD ADMINISTRADOR
//========================================
function cargarUsuarios() {
    let tabla = document.getElementById("tablaUsuarios");
    if (!tabla) return;
    tabla.innerHTML = "";
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    let tecnicos = 0;
    usuarios.forEach((usuario, index) => {
        if (usuario.rol === "tecnico") {
            tecnicos++;
        }
        tabla.innerHTML += `
        <tr>
        <td>${usuario.nombre} ${usuario.apellido}</td>
        <td>${usuario.usuario}</td>
        <td>${usuario.departamento}</td>
        <td>${usuario.rol}</td>
        <td>
        <button
        class="btn btn-danger btn-sm"
        onclick="eliminarUsuario(${index})">
        Eliminar
        </button>
        </td>
        </tr>
        `;
    });
    document.getElementById("totalUsuarios").innerHTML = usuarios.length;
    document.getElementById("totalTecnicos").innerHTML = tecnicos;
    let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
    document.getElementById("totalTickets").innerHTML = tickets.length;
    let resueltos = tickets.filter(t => t.estado === "Resuelto");
    document.getElementById("ticketsResueltos").innerHTML = resueltos.length;
}
function eliminarUsuario(indice) {
    if (confirm("¿Eliminar este usuario?")) {
        let usuarios = JSON.parse(localStorage.getItem("usuarios"));
        usuarios.splice(indice, 1);
        localStorage.setItem("usuarios", JSON.stringify(usuarios));
        cargarUsuarios();
    }
}
function abrirTicket(id) {
    localStorage.setItem("ticketActual", id);
    window.location.href = "detalle-ticket.html";
}
function cargarDetalleTicket() {
    let id = localStorage.getItem("ticketActual");
    if (!id) return;
    let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
    let ticket = tickets.find(t => t.id == id);
    if (!ticket) return;
    document.getElementById("idTicket").innerHTML = ticket.id;
    document.getElementById("cliente").innerHTML = ticket.cliente;
    document.getElementById("equipo").innerHTML = ticket.equipo;
    document.getElementById("departamento").innerHTML = ticket.departamento;
    document.getElementById("descripcion").innerHTML = ticket.descripcion;
    document.getElementById("estado").value = ticket.estado;
    document.getElementById("diagnostico").value = ticket.diagnostico || "";
    document.getElementById("observaciones").value = ticket.observaciones || "";
    document.getElementById("solucion").value = ticket.solucion || "";
}
function guardarCambiosTicket() {
    let id = localStorage.getItem("ticketActual");
    let tickets = JSON.parse(localStorage.getItem("tickets")) || [];
    tickets.forEach(ticket => {
        if (ticket.id == id) {
            ticket.estado = document.getElementById("estado").value;
            ticket.diagnostico = document.getElementById("diagnostico").value;
            ticket.observaciones = document.getElementById("observaciones").value;
            ticket.solucion = document.getElementById("solucion").value;
        }
    });
    localStorage.setItem("tickets", JSON.stringify(tickets));
    alert("Ticket actualizado correctamente.");
    window.location.href = "dashboard-tecnico.html";
}

//======================================
// CARGAR USUARIOS
//======================================

function cargarUsuarios() {

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    let tabla = document.getElementById("tablaUsuarios");

    if (!tabla) return;

    tabla.innerHTML = "";

    usuarios.forEach((usuario, index) => {

        tabla.innerHTML += `

        <tr>

        <td>${usuario.usuario}</td>

        <td>${usuario.rol}</td>

        <td>

        <span class="badge bg-success">

        Activo

        </span>

        </td>

        <td>

        <button
        class="btn btn-warning btn-sm"
        onclick="editarUsuario(${index})">

        <i class="bi bi-pencil"></i>

        </button>

        <button
        class="btn btn-danger btn-sm"
        onclick="eliminarUsuario(${index})">

        <i class="bi bi-trash"></i>

        </button>

        </td>

        </tr>

        `;

    });

}

function eliminarUsuario(index) {

    if (confirm("¿Eliminar este usuario?")) {

        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

        usuarios.splice(index, 1);

        localStorage.setItem("usuarios", JSON.stringify(usuarios));

        cargarUsuarios();

    }

}

function editarUsuario(index) {

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    let usuario = usuarios[index];

    document.getElementById("editarIndex").value = index;

    document.getElementById("editarNombre").value = usuario.nombre;

    document.getElementById("editarCorreo").value = usuario.correo;

    document.getElementById("editarTelefono").value = usuario.telefono;

    document.getElementById("editarDepartamento").value = usuario.departamento;

    document.getElementById("editarRol").value = usuario.rol;

    let modal = new bootstrap.Modal(document.getElementById("modalEditar"));

    modal.show();

}

function guardarEdicionUsuario() {

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    let index = document.getElementById("editarIndex").value;

    usuarios[index].nombre = document.getElementById("editarNombre").value;

    usuarios[index].correo = document.getElementById("editarCorreo").value;

    usuarios[index].telefono = document.getElementById("editarTelefono").value;

    usuarios[index].departamento = document.getElementById("editarDepartamento").value;

    usuarios[index].rol = document.getElementById("editarRol").value;

    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    bootstrap.Modal.getInstance(document.getElementById("modalEditar")).hide();

    cargarUsuarios();

    alert("Usuario actualizado correctamente.");

}