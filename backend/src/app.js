const express = require('express');
const cors = require('cors');

const responder = require('./utils/respuesta');

const healthRoutes = require('./routes/health.routes')
const usuarioRoutes = require('./routes/usuario.routes')
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/auth", authRoutes);

// ninguna ruta de arriba matcheo — recurso de la API inexistente
app.use("/api", (req, res) => {
    responder(res, 404, { message: "Recurso no encontrado." });
});

// manejador de errores global: sin esto, cualquier next(error) (por ejemplo
// el 403 que dispara verificarRol cuando el rol no coincide) caia en el
// manejador por defecto de Express, que devuelve HTML en vez del contrato
// { success, message } que espera el frontend.
app.use((err, req, res, next) => {
    responder(res, err.status || 500, {
        message: err.message || "Error interno del servidor"
    });
});

module.exports = app;
