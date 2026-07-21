const crearError = require("../utils/crearError");

const verificarRol = (...rolesPermitidos) => {
    
    return (req, res, next) => {
        
        if(!rolesPermitidos.includes(req.usuario.rol)) {
            return next(crearError("No tienes permisos para realizar esta accion.", 403))
        }

        next();
    }
}

module.exports = verificarRol;