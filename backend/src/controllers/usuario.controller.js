const usuarioService = require('../services/usuario.service');
const auditoriaService = require('../services/auditoria.service');
const especialidadService = require('../services/especialidad.service');
const responder = require('../utils/respuesta');
const ROLES = require('../constants/roles');

const crearUsuario = async (req, res) => {
    try {
        const datos = { ...req.body };

        // Recepcionista solo puede dar de alta clientes, nunca otro rol
        if (req.usuario.rol === ROLES.RECEPCIONISTA) {
            datos.rol = ROLES.CLIENTE;
        }

        const usuario = await usuarioService.crearUsuario(datos);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "USUARIO_CREADO",
            descripcion: `Creó el usuario ${usuario.nombre} ${usuario.apellido} (${usuario.rol}).`
        });

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

const ROLES_STAFF_CONSULTA = [ROLES.ADMINISTRADOR, ROLES.TECNICO, ROLES.RECEPCIONISTA];

const obtenerUsuarioPorId = async (req, res) => {
    try {
        const { id } = req.params

        const esStaff = ROLES_STAFF_CONSULTA.includes(req.usuario.rol);
        const esPropiaCuenta = Number(id) === Number(req.usuario.id_usuario);

        if (!esStaff && !esPropiaCuenta) {
            return responder(res, 403, {
                message: "No tenés permisos para ver este usuario."
            });
        }

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
        const { estado } = req.body
        const usuario = await usuarioService.actualizarEstadoUsuario(id, estado);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: usuario.estado === "Activo" ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO",
            descripcion: `${usuario.estado === "Activo" ? "Activó" : "Desactivó"} al usuario ${usuario.nombre} ${usuario.apellido}.`
        });

        responder(res, 200, {
            data: usuario
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }

}

// el usuario logueado cambia su propia contraseña (requiere la actual)
const cambiarContrasena = async (req, res) => {
    try {
        const { id } = req.params;

        if (Number(id) !== Number(req.usuario.id_usuario)) {
            return responder(res, 403, {
                message: "Solo podés cambiar tu propia contraseña."
            });
        }

        const { contraseñaActual, contraseñaNueva } = req.body;

        await usuarioService.cambiarContrasena(id, contraseñaActual, contraseñaNueva);

        responder(res, 200, {
            message: "Contraseña actualizada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// un Admin fija una contraseña nueva para otro usuario, sin conocer la actual
const resetearContrasena = async (req, res) => {
    try {
        const { id } = req.params
        const { contraseñaNueva } = req.body

        await usuarioService.resetearContrasena(id, contraseñaNueva);

        // solo para el nombre en la descripcion de auditoria — no afecta el
        // resultado de la operacion si esta segunda consulta fallara
        const usuario = await usuarioService.obtenerUsuarioPorId(id).catch(() => null);

        auditoriaService.registrarEvento({
            id_usuario: req.usuario.id_usuario,
            accion: "CLAVE_RESETEADA",
            descripcion: `Reseteó la contraseña de ${usuario ? `${usuario.nombre} ${usuario.apellido}` : `usuario #${id}`}.`
        });

        responder(res, 200, {
            message: "Contraseña reseteada exitosamente"
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// el usuario logueado edita su propio telefono/direccion (nunca rol,
// correo, ni otros campos sensibles: se ignora todo lo demas del body)
const actualizarPerfilPropio = async (req, res) => {
    try {
        const { id } = req.params;

        if (Number(id) !== Number(req.usuario.id_usuario)) {
            return responder(res, 403, {
                message: "Solo podés editar tu propio perfil."
            });
        }

        const { telefono, direccion } = req.body;

        const usuario = await usuarioService.actualizarPerfilPropio(id, { telefono, direccion });

        responder(res, 200, {
            data: usuario
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// especialidades tecnicas de un usuario (catalogo estructurado, distinto
// del campo de texto libre usuario.especialidad)
const obtenerEspecialidadesUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const especialidades = await especialidadService.obtenerEspecialidadesDeTecnico(id);

        responder(res, 200, {
            data: especialidades
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })
    }
}

// reemplaza el set completo de especialidades de un tecnico (whitelist,
// exclusivo de Administrador)
const asignarEspecialidadesUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { especialidades } = req.body;

        const actualizadas = await especialidadService.asignarEspecialidadesTecnico(id, especialidades);

        responder(res, 200, {
            data: actualizadas
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
    cambiarContrasena,
    resetearContrasena,
    actualizarPerfilPropio,
    obtenerEspecialidadesUsuario,
    asignarEspecialidadesUsuario,
    borrarUsuario
}
