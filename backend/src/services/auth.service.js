const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crearError = require("../utils/crearError");
const ESTADOS_USUARIO = require("../constants/estadosUsuario");

// TODO: extraer las validaciones manuales de este service a una capa de
// validadores dedicada en una futura refactorización.

const login = async (correo, contraseña) => {

    if (!correo || !contraseña) {
        throw crearError("Correo y contraseña son requeridos", 400);
    }

    const [usuarios] = await pool.query(
        `
        SELECT
            id_usuario,
            nombre,
            apellido,
            correo,
            contraseña,
            rol,
            estado
        FROM usuario
        WHERE correo = ?
        `,
        [correo]
    );

    if (usuarios.length === 0) {
        throw crearError("Correo o contraseña incorrectos", 401);
    }

    const usuario = usuarios[0];

    if (usuario.estado !== ESTADOS_USUARIO.ACTIVO) {
        throw crearError("El usuario esta inactivo", 403);
    }

    const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña)

    if (!contraseñaValida) {
        throw crearError("Correo o contraseña incorrectos", 401);

    }
    
    const token = jwt.sign(
        {
            id_usuario: usuario.id_usuario,
            rol: usuario.rol
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

    return {
        token,
        usuario: {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            correo: usuario.correo,
            rol: usuario.rol,
            estado: usuario.estado
        }
    };
}

module.exports = {
    login
}