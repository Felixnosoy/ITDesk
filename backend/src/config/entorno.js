require("dotenv").config({ quiet: true });

// Configuracion por entorno (issue HU19.2). Todo valor que cambia entre la
// maquina de desarrollo y produccion sale de variables de entorno; aca se
// revisan al arrancar el servidor para fallar enseguida con un mensaje
// claro, en vez de levantar una API que falla recien con el primer login.
//
// En desarrollo (NODE_ENV distinto de production) se aceptan valores
// comodos: CORS abierto y la base con root sin clave, como en XAMPP. En
// produccion esos valores se rechazan.

const esProduccion = (env = process.env) => env.NODE_ENV === "production";

const LARGO_MINIMO_SECRETO = 32;

// "https://a.com, https://b.com/" -> ["https://a.com", "https://b.com"]
const leerOrigenes = (valor) =>
    (valor ?? "")
        .split(",")
        .map((origen) => origen.trim().replace(/\/+$/, ""))
        .filter(Boolean);

// Revisa las variables y devuelve la lista de problemas (vacia si todo
// esta bien). Se juntan todos para poder arreglarlos de una sola vez.
const problemasDeEntorno = (env = process.env) => {
    const problemas = [];
    const produccion = esProduccion(env);

    for (const nombre of ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"]) {
        if (!env[nombre] || env[nombre].trim() === "") {
            problemas.push(`Falta ${nombre}.`);
        }
    }

    if (env.PORT && !/^\d+$/.test(env.PORT)) {
        problemas.push("PORT debe ser un número.");
    }

    for (const origen of leerOrigenes(env.CORS_ORIGINS)) {
        if (!/^https?:\/\/[^/\s]+$/.test(origen)) {
            problemas.push(`CORS_ORIGINS tiene un origen inválido: "${origen}". Debe ser como https://mi-app.onrender.com, sin ruta.`);
        }
    }

    if (produccion) {
        if (env.JWT_SECRET && env.JWT_SECRET.length < LARGO_MINIMO_SECRETO) {
            problemas.push(`JWT_SECRET debe tener al menos ${LARGO_MINIMO_SECRETO} caracteres en producción.`);
        }

        if (leerOrigenes(env.CORS_ORIGINS).length === 0) {
            problemas.push("Falta CORS_ORIGINS: en producción hay que indicar la URL del frontend.");
        }

        if (leerOrigenes(env.CORS_ORIGINS).some((origen) => /localhost|127\.0\.0\.1/.test(origen))) {
            problemas.push("CORS_ORIGINS no puede apuntar a localhost en producción.");
        }

        if (!env.DB_PASSWORD) {
            problemas.push("Falta DB_PASSWORD: en producción la base no puede quedar sin clave.");
        }

        if (env.DB_USER === "root") {
            problemas.push("DB_USER no puede ser root en producción: usa el usuario de la aplicación (npm run db:usuarios).");
        }
    }

    return problemas;
};

// Lo llama server.js antes de levantar la API
const validarEntorno = (env = process.env) => {
    const problemas = problemasDeEntorno(env);

    if (problemas.length > 0) {
        throw new Error(`Configuración incompleta:\n- ${problemas.join("\n- ")}`);
    }
};

// Opciones del middleware cors: en produccion solo los origenes de
// CORS_ORIGINS; en desarrollo, si no se configura, cualquiera.
const opcionesCors = (env = process.env) => {
    const origenes = leerOrigenes(env.CORS_ORIGINS);

    if (origenes.length === 0 && !esProduccion(env)) {
        return { origin: true };
    }

    return { origin: origenes };
};

module.exports = {
    esProduccion,
    problemasDeEntorno,
    validarEntorno,
    opcionesCors
};
