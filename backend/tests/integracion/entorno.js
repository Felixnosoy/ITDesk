const os = require("os");
const path = require("path");
const { nombreBaseDePrueba } = require("./base-de-prueba");

// Antes de cargar la app: la API usa la base de prueba y guarda las
// imagenes en una carpeta temporal, nunca en backend/uploads.
process.env.DB_NAME = nombreBaseDePrueba();
// la API se conecta con el usuario restringido que creo preparar-base.js
process.env.DB_USER = process.env.PRUEBAS_DB_USER;
process.env.DB_PASSWORD = process.env.PRUEBAS_DB_PASSWORD;
process.env.UPLOADS_DIR = path.join(os.tmpdir(), "itdesk-pruebas-uploads");
process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-de-prueba";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
