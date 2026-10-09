const pool = require("../config/database");

// Estado de la API para monitoreo (issue HU19.6). La base se prueba con
// una consulta minima; si falla o tarda demasiado se informa como no
// disponible en vez de dejar colgado al monitor.
const ESPERA_MAXIMA_MS = 3000;

const consultarBaseDeDatos = async () => {
    let temporizador;
    const limite = new Promise((_, rechazar) => {
        temporizador = setTimeout(() => rechazar(new Error("tiempo agotado")), ESPERA_MAXIMA_MS);
    });

    try {
        await Promise.race([pool.query("SELECT 1"), limite]);
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(temporizador);
    }
};

const obtenerEstado = async () => {
    const baseDisponible = await consultarBaseDeDatos();

    return {
        estado: baseDisponible ? "ok" : "degradado",
        base_de_datos: baseDisponible ? "disponible" : "no disponible",
        activo_desde_segundos: Math.round(process.uptime()),
        fecha: new Date().toISOString()
    };
};

module.exports = {
    obtenerEstado
};
