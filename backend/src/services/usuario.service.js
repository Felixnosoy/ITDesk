const pool = require("../config/database")
const bcrypt = require("bcrypt");
const crearError = require("../utils/crearError");
const ESTADOS_USUARIO = require("../constants/estadosUsuario");
const { verificarUsuarioExiste } = require("../validators/usuario.validator");

// TODO: extraer las validaciones manuales de este service a una capa de
// validadores dedicada en una futura refactorización.

const COLUMNAS_USUARIO = `
    id_usuario,
    nombre,
    apellido,
    correo,
    rol,
    tipo_documento,
    num_documento,
    telefono,
    direccion,
    especialidad,
    estado,
    fecha_registro
`;


//funcion para crear usuarios
const crearUsuario = async (datosUsuario) => {
    const {
        nombre,
        apellido,
        correo,
        contraseña: password,
        rol,
        tipo_documento,
        num_documento,
        telefono,
        direccion,
        especialidad,
        estado
    } = datosUsuario;

    //verificar que el correo no exista
    const [usuarioExistente] = await pool.query(
        "SELECT id_usuario FROM usuario WHERE correo = ?",
        [correo]
    )

    if (usuarioExistente.length > 0) {
        throw crearError("El correo ya esta registrado.", 409)
    }

    //verificar que el numero de documento no exista
    const [documentoExiste] = await pool.query(
        "SELECT id_usuario FROM usuario WHERE num_documento = ?",
        [num_documento]
    )

    if (documentoExiste.length > 0) {
        throw crearError("El numero de documento ya esta registrado. ", 409)
    }

    //encriptar la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await pool.query(
        `INSERT INTO usuario
        (
            nombre,
            apellido,
            correo,
            contraseña,
            rol,
            tipo_documento,
            num_documento,
            telefono,
            direccion,
            especialidad,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            nombre,
            apellido,
            correo,
            passwordHash,
            rol,
            tipo_documento,
            num_documento,
            telefono,
            direccion,
            especialidad,
            estado
        ]
    );

    //buscar usuario recien creado
    const [usuario] = await pool.query(
        `
            SELECT
                ${COLUMNAS_USUARIO}
            FROM usuario
            WHERE id_usuario = ?
            `,
        [resultado.insertId]
    );

    return usuario[0];
};

//funcion para obtener todos los usuarios
const obtenerUsuarios = async () => {

    const [usuarios] = await pool.query(`
        SELECT
            ${COLUMNAS_USUARIO}
        FROM usuario
        ORDER BY id_usuario DESC
        `
    );

    if (usuarios.length === 0) {
        throw crearError("No existen usuarios registrados.", 404);
    }

    return usuarios

}

//funcion para obtener el usuario por Id
const obtenerUsuarioPorId = async (id) => {

    const [usuario] = await pool.query(
        `
            SELECT
                ${COLUMNAS_USUARIO}
            FROM usuario
            WHERE id_usuario = ?
        `,
        [id]
    );

    if (usuario.length === 0) {
        throw crearError("usuario no encontrado", 409)
    }

    return usuario[0]
}

// funcion que actualiza datos del usuario
const actualizarUsuario = async (id, nuevosDatos) => {

    const {
        nombre,
        apellido,
        correo,
        rol,
        tipo_documento,
        num_documento,
        telefono,
        direccion,
        especialidad
    } = nuevosDatos;

    //verificar que el usuario a actualizar exista
    await verificarUsuarioExiste(id, "usuario no encontrado");

    //verificar que el correo no este en uso por otro usuario
    const [correoExiste] = await pool.query(
        "SELECT id_usuario FROM usuario WHERE correo = ? AND id_usuario != ?",
        [correo, id]
    )

    if (correoExiste.length > 0) {
        throw crearError("El correo ya esta registrado.", 409)
    }

    //verificar que el numero de documento no este en uso por otro usuario
    const [documentoExiste] = await pool.query(
        "SELECT id_usuario FROM usuario WHERE num_documento = ? AND id_usuario != ?",
        [num_documento, id]
    )

    if (documentoExiste.length > 0) {
        throw crearError("El numero de documento ya esta registrado. ", 409)
    }

    await pool.query(
        `
            UPDATE usuario
            SET
                nombre = ?,
                apellido = ?,
                correo = ?,
                rol = ?,
                tipo_documento = ?,
                num_documento = ?,
                telefono = ?,
                direccion = ?,
                especialidad = ?
            WHERE id_usuario = ?
        `,
        [
            nombre,
            apellido,
            correo,
            rol,
            tipo_documento,
            num_documento,
            telefono,
            direccion,
            especialidad,
            id
        ]
    );

    const [usuario] = await pool.query(
        `
            SELECT
                ${COLUMNAS_USUARIO}
            FROM usuario
            WHERE id_usuario = ?
        `,
        [id]
    );

    return usuario[0];
}

// funcion para cambiar estado de un usuario en vez de eliminarlo
const actualizarEstadoUsuario = async (id, estado) => {

    await verificarUsuarioExiste(id, "usuario no encontrado");

    if (typeof estado !== "string") {
        throw crearError("Estado inválido", 400);
    }

    const estadoNormalizado = estado.trim().toLowerCase();

    if (
        estadoNormalizado !== ESTADOS_USUARIO.ACTIVO.toLowerCase() &&
        estadoNormalizado !== ESTADOS_USUARIO.INACTIVO.toLowerCase()
    ) {
        throw crearError("Estado inválido", 400);
    }

    const estadoFinal =
        estadoNormalizado.charAt(0).toUpperCase() +
        estadoNormalizado.slice(1);

    await pool.query(
        `
        UPDATE usuario
        SET estado = ?
        WHERE id_usuario = ?
        `,
        [estadoFinal, id]
    );

    const [usuarios] = await pool.query(
        `
        SELECT
            ${COLUMNAS_USUARIO}
        FROM usuario
        WHERE id_usuario = ?
        `,
        [id]
    );

    return usuarios[0];

}

//solo para datos de pruebas (no se debe usar)
const borrarUsuario = async (id) => {

    // Verificar que el usuario exista
    await obtenerUsuarioPorId(id);

    // Eliminar el usuario
    await pool.query(
        `
        DELETE FROM usuario
        WHERE id_usuario = ?
        `,
        [id]
    );
};

module.exports = {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    actualizarEstadoUsuario,
    borrarUsuario
}
