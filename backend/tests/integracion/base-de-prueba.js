const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env"), quiet: true });

// Nombre de la base de prueba: DB_NAME_TEST o, si no esta, DB_NAME con
// _test al final. Tiene que terminar en _test para que estas pruebas
// nunca puedan borrar la base con la que se trabaja.
const nombreBaseDePrueba = () => {
    const nombre = process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test`;

    if (!/^\w+_test$/.test(nombre)) {
        throw new Error(`La base de prueba "${nombre}" tiene que terminar en _test.`);
    }

    return nombre;
};

module.exports = { nombreBaseDePrueba };
