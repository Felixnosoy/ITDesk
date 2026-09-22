const healthService = require('../services/health.service')
const responder = require('../utils/respuesta')

const health = async (req, res) => {
    try{
        const database = await healthService.checkDataBase();

        responder(res, 200, {
            message: "API y Base de Datos funcionando correctamente",
            database: rows[0]
        });

    } catch(error) {
        console.log(error)

        responder(res, 500, {
            message: "Error al conectar con la base de datos"
        })
    }
}

module.exports = { health };