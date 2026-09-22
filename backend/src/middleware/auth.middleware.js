const jwt = require("jsonwebtoken");
const crearError = require("../utils/crearError");

const verificarToken = (req, res, next) => {

    try {
        const authorization = req.headers.authorization;

        if (!authorization) {
            throw crearError("Token no proporcionado.", 401);
        }

        const partes = authorization.split(" ");

        if (partes.length !== 2 || partes[0] !== "Bearer") {
            throw crearError("Formato de token inválido.", 401);
        }

        const token = partes[1];

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        req.usuario = payload;

        next();
    } catch (error) {
        next(crearError("Token inválido o expirado", 401));
    }
}

module.exports = verificarToken;