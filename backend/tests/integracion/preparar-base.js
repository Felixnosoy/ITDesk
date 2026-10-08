const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { nombreBaseDePrueba } = require("./base-de-prueba");
const { aplicarUsuarios } = require("../../scripts/usuarios-bd");

// usuario restringido con el que corre la API durante las pruebas
const USUARIO_APP_PRUEBA = "itdesk_app_prueba";

const CARPETA_SQL = path.join(__dirname, "..", "..", "..", "base de datos");

// Se corre una vez antes de todas las pruebas: borra y vuelve a crear la
// base de prueba con el esquema y los datos de prueba del repo. Despues
// crea un usuario con los mismos privilegios minimos que tiene el backend
// en produccion (scripts/privilegios.js), y la API de las pruebas se
// conecta con el (issue HU26.3): si al backend le falta un permiso, una
// prueba falla aca y no en el servidor. Esto necesita que DB_USER pueda
// crear usuarios (root en la maquina de desarrollo).
module.exports = async () => {
    const nombre = nombreBaseDePrueba();
    const conexion = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    try {
        await conexion.query(`DROP DATABASE IF EXISTS \`${nombre}\``);
        await conexion.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await conexion.query(`USE \`${nombre}\``);
        await conexion.query(fs.readFileSync(path.join(CARPETA_SQL, "schema.sql"), "utf8"));
        await conexion.query(fs.readFileSync(path.join(CARPETA_SQL, "datos-prueba.sql"), "utf8"));

        const clave = crypto.randomBytes(18).toString("base64url");
        await aplicarUsuarios(conexion, { base: nombre, app: { usuario: USUARIO_APP_PRUEBA, clave } });

        // los procesos de las pruebas heredan estas variables (ver entorno.js)
        process.env.PRUEBAS_DB_USER = USUARIO_APP_PRUEBA;
        process.env.PRUEBAS_DB_PASSWORD = clave;
    } finally {
        await conexion.end();
    }
};
