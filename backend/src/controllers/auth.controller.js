const authService = require("../services/auth.service")
const responder = require("../utils/respuesta")

const login = async (req, res) => {
    try {
        const {contraseña, correo} = req.body

        const usuario = await authService.login(correo, contraseña)

        responder(res, 200, {
            message: "Login exitoso",
            data: usuario
        })

    } catch (error) {
        responder(res, error.status || 500, {
            message: error.message
        })

    }
}

module.exports = {
    login
}