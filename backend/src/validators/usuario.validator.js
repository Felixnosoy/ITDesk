const pool = require("../config/database")
const crearError = require("../utils/crearError");
const ROLES = require("../constants/roles");

// Verifica que el usuario exista (sin filtrar por rol)
const verificarUsuarioExiste = async (id_usuario, mensajeError = "El usuario no existe.") => {

    const [usuarios] = await pool.query(
        `
        SELECT id_usuario
        FROM usuario
        WHERE id_usuario = ?
        `,
        [id_usuario]
    );

    if (usuarios.length === 0) {
        throw crearError(mensajeError, 404);
    }
}

// Verifica que el usuario exista y tenga uno de los roles indicados
const verificarUsuarioConRol = async (id_usuario, roles, mensajeError) => {

    const placeholders = roles.map(() => "?").join(", ");

    const [usuarios] = await pool.query(
        `
        SELECT id_usuario
        FROM usuario
        WHERE id_usuario = ?
        AND rol IN (${placeholders})
        `,
        [id_usuario, ...roles]
    );

    if (usuarios.length === 0) {
        throw crearError(mensajeError, 404);
    }
}

// Verifica que el usuario exista y tenga rol de Cliente
const verificarClienteExiste = (id_usuario) =>
    verificarUsuarioConRol(id_usuario, [ROLES.CLIENTE], "El cliente no existe.");

// Verifica que el usuario exista y tenga rol de Tecnico
const verificarTecnicoExiste = (id_usuario) =>
    verificarUsuarioConRol(id_usuario, [ROLES.TECNICO], "El técnico no existe.");

// Verifica que el usuario exista y sea staff (Administrador o Tecnico).
// Los clientes nunca registran actualizaciones de un ticket.
const verificarStaffExiste = (id_usuario) =>
    verificarUsuarioConRol(
        id_usuario,
        [ROLES.ADMINISTRADOR, ROLES.TECNICO],
        "El usuario no existe o no tiene permisos para actualizar tickets."
    );

module.exports = {
    verificarUsuarioExiste,
    verificarUsuarioConRol,
    verificarClienteExiste,
    verificarTecnicoExiste,
    verificarStaffExiste
}
