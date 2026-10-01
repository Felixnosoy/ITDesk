const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { nombreBaseDePrueba } = require("./base-de-prueba");

const CARPETA_SQL = path.join(__dirname, "..", "..", "..", "base de datos");

// Se corre una vez antes de todas las pruebas: borra y vuelve a crear la
// base de prueba con el esquema y los datos de prueba del repo.
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
    } finally {
        await conexion.end();
    }
};
