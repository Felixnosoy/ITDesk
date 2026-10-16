const pool = require("../config/database")
const bcrypt = require("bcrypt");
const crearError = require("../utils/crearError");
const ESTADOS_USUARIO = require("../constants/estadosUsuario");
const ROLES = require("../constants/roles");
const TIPOS_CLIENTE = require("../constants/tiposCliente");
const { verificarUsuarioExiste } = require("../validators/usuario.validator");
const { validarTextoOpcional, validarCatalogoOpcional } = require("../validators/comun.validator");

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
    tipo_cliente,
    empresa,
    rnc,
    contacto_alterno_nombre,
    contacto_alterno_telefono,
    estado,
    fecha_registro
`;


// Datos que solo tiene un cliente: si es persona o empresa (con su nombre y
// RNC) y a quien llamar si no responde. Para el personal quedan en null.
const datosDeCliente = (rol, datos) => {
    if (rol !== ROLES.CLIENTE) {
        return { tipo_cliente: null, empresa: null, rnc: null, contacto_alterno_nombre: null, contacto_alterno_telefono: null };
    }

    const tipo_cliente =
        validarCatalogoOpcional(datos.tipo_cliente, "tipo_cliente", Object.values(TIPOS_CLIENTE)) ?? TIPOS_CLIENTE.PERSONA;
    const esEmpresa = tipo_cliente === TIPOS_CLIENTE.EMPRESA;

    return {
        tipo_cliente,
        empresa: esEmpresa ? validarTextoOpcional(datos.empresa, "empresa", 150) : null,
        rnc: esEmpresa ? validarTextoOpcional(datos.rnc, "rnc", 20) : null,
        contacto_alterno_nombre: validarTextoOpcional(datos.contacto_alterno_nombre, "contacto_alterno_nombre", 150),
        contacto_alterno_telefono: validarTextoOpcional(datos.contacto_alterno_telefono, "contacto_alterno_telefono", 20),
    };
};

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

    // se valida antes de consultar la base: un dato mal formado no deja nada a medias
    const cliente = datosDeCliente(rol, datosUsuario);

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
            tipo_cliente,
            empresa,
            rnc,
            contacto_alterno_nombre,
            contacto_alterno_telefono,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            cliente.tipo_cliente,
            cliente.empresa,
            cliente.rnc,
            cliente.contacto_alterno_nombre,
            cliente.contacto_alterno_telefono,
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

const LONGITUD_MINIMA_BUSQUEDA = 2;
const LIMITE_BUSQUEDA_CLIENTES = 20;

// % y _ son comodines de LIKE: se escapan para que un documento como
// "001_2" se busque literal y no como patron
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

// Busqueda de clientes para el registro de tickets en Recepcion: por
// nombre, apellido, nombre completo, documento o correo. Solo clientes
// activos, porque a un cliente desactivado no se le abren tickets nuevos.
const buscarClientes = async (busqueda) => {
    const texto = typeof busqueda === "string" ? busqueda.trim() : "";

    if (texto.length < LONGITUD_MINIMA_BUSQUEDA) {
        throw crearError(
            `Escribe al menos ${LONGITUD_MINIMA_BUSQUEDA} caracteres para buscar.`,
            400
        );
    }

    const patron = `%${escaparLike(texto)}%`;

    const [clientes] = await pool.query(
        `
        SELECT
            id_usuario,
            nombre,
            apellido,
            correo,
            tipo_documento,
            num_documento,
            telefono
        FROM usuario
        WHERE rol = ?
        AND estado = ?
        AND (
            nombre LIKE ?
            OR apellido LIKE ?
            OR CONCAT(nombre, ' ', apellido) LIKE ?
            OR num_documento LIKE ?
            OR correo LIKE ?
        )
        ORDER BY nombre, apellido
        LIMIT ?
        `,
        [
            ROLES.CLIENTE,
            ESTADOS_USUARIO.ACTIVO,
            patron,
            patron,
            patron,
            patron,
            patron,
            LIMITE_BUSQUEDA_CLIENTES
        ]
    );

    return clientes;
};

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

    // datos de cliente (empresa, contacto alterno); si deja de ser cliente
    // quedan en null. Se valida antes de tocar la base
    const cliente = datosDeCliente(rol, nuevosDatos);

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
                especialidad = ?,
                tipo_cliente = ?,
                empresa = ?,
                rnc = ?,
                contacto_alterno_nombre = ?,
                contacto_alterno_telefono = ?
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
            cliente.tipo_cliente,
            cliente.empresa,
            cliente.rnc,
            cliente.contacto_alterno_nombre,
            cliente.contacto_alterno_telefono,
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

// el propio usuario edita su telefono/direccion — nunca correo, rol ni
// documento, esos siguen siendo solo editables por Admin/Tecnico via
// actualizarUsuario
const actualizarPerfilPropio = async (id, { telefono, direccion }) => {

    await verificarUsuarioExiste(id, "usuario no encontrado");

    await pool.query(
        `
        UPDATE usuario
        SET telefono = ?, direccion = ?
        WHERE id_usuario = ?
        `,
        [telefono || null, direccion || null, id]
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
};

const LONGITUD_MINIMA_CONTRASENA = 8;

const validarContrasenaNueva = (contraseñaNueva) => {
    if (typeof contraseñaNueva !== "string" || contraseñaNueva.trim().length < LONGITUD_MINIMA_CONTRASENA) {
        throw crearError(`La nueva contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`, 400);
    }
};

// el propio usuario cambia su contraseña: exige la actual para confirmarla
const cambiarContrasena = async (id, contraseñaActual, contraseñaNueva) => {

    if (!contraseñaActual || !contraseñaNueva) {
        throw crearError("La contraseña actual y la nueva son requeridas.", 400);
    }

    validarContrasenaNueva(contraseñaNueva);

    const [usuarios] = await pool.query(
        "SELECT contraseña FROM usuario WHERE id_usuario = ?",
        [id]
    );

    if (usuarios.length === 0) {
        throw crearError("usuario no encontrado", 404);
    }

    const contraseñaValida = await bcrypt.compare(contraseñaActual, usuarios[0].contraseña);

    if (!contraseñaValida) {
        throw crearError("La contraseña actual no es correcta.", 400);
    }

    const passwordHash = await bcrypt.hash(contraseñaNueva, 10);

    await pool.query(
        "UPDATE usuario SET contraseña = ? WHERE id_usuario = ?",
        [passwordHash, id]
    );
};

// un Admin fija una contraseña nueva para otro usuario, sin conocer la actual
const resetearContrasena = async (id, contraseñaNueva) => {

    await verificarUsuarioExiste(id, "usuario no encontrado");

    validarContrasenaNueva(contraseñaNueva);

    const passwordHash = await bcrypt.hash(contraseñaNueva, 10);

    await pool.query(
        "UPDATE usuario SET contraseña = ? WHERE id_usuario = ?",
        [passwordHash, id]
    );
};

module.exports = {
    buscarClientes,
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    actualizarEstadoUsuario,
    cambiarContrasena,
    resetearContrasena,
    actualizarPerfilPropio
}
