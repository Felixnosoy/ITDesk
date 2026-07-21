const usuarioService = require('../services/usuario.service');
const responder = require('../utils/respuesta');

const crearUsuario = async (req, res) => {
    try {
        const usuario = await usuarioService.crearUsuario(req.body);

        responder(res, 200, {
            message: "Usuario creado exitosamente",
            data: usuario
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await usuarioService.obtenerUsuarios();

        responder(res, 200, {
            data: usuarios
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const obtenerUsuarioPorId = async (req, res) => {
    try {
        const { id } = req.params

        const usuario = await usuarioService.obtenerUsuarioPorId(id);

        responder(res, 200, {
            data: usuario
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params

        const usuario = await usuarioService.actualizarUsuario(id, req.body)

        responder(res, 200, {
            data: usuario
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

const actualizarEstadoUsuario = async (req, res) => {
    try {
        const { id } = req.params
        const usuario = await usuarioService.actualizarEstadoUsuario(id, req.body);

        responder(res, 200, {
            data: usuario
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }

}

//solo para datos de pruebas (no se debe usar)
const borrarUsuario = async (req, res) => {
    try {
        const {id} = req.params

        const usuario = await usuarioService.borrarUsuario(id);

        responder(res, 200, {
            message: "Usuario eliminado exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })

    }
}

module.exports = {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    actualizarEstadoUsuario,
    borrarUsuario
}
