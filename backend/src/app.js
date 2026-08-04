const express = require('express');
const cors = require('cors');

const responder = require('./utils/respuesta');

const healthRoutes = require('./routes/health.routes')
const usuarioRoutes = require('./routes/usuario.routes')
const authRoutes = require("./routes/auth.routes");
const equipoRoutes = require("./routes/equipo.routes")
const ticketRoutes = require("./routes/ticket.routes")
const asignacionRoutes = require("./routes/asignacion.routes")
const diagnosticoRoutes = require("./routes/diagnostico.routes")
const actualizacionRoutes = require("./routes/actualizacion.routes")
const cotizacionRoutes = require("./routes/cotizacion.routes")
const detalleCotizacionRoutes = require("./routes/detalleCotizacion.routes")
const facturaRoutes = require("./routes/factura.routes")
const detalleFacturaRoutes = require("./routes/detalleFactura.routes")
const notificacionRoutes = require("./routes/notificacion.routes")
const archivoRoutes = require("./routes/archivo.routes")
const notaPrivadaRoutes = require("./routes/notaPrivada.routes")
const auditoriaRoutes = require("./routes/auditoria.routes")
const encuestaRoutes = require("./routes/encuesta.routes")
const estadisticasRoutes = require("./routes/estadisticas.routes")
const especialidadRoutes = require("./routes/especialidad.routes")
const visitaRoutes = require("./routes/visita.routes")

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/equipo", equipoRoutes)
app.use("/api/ticket", ticketRoutes)
app.use("/api/asignacion", asignacionRoutes)
app.use("/api/diagnostico", diagnosticoRoutes)
app.use("/api/actualizacion", actualizacionRoutes)
app.use("/api/cotizacion", cotizacionRoutes)
app.use("/api/detalle-cotizacion", detalleCotizacionRoutes)
app.use("/api/factura", facturaRoutes)
app.use("/api/detalle-factura", detalleFacturaRoutes)
app.use("/api/notificacion", notificacionRoutes)
app.use("/api/archivos", archivoRoutes)
app.use("/api/notas", notaPrivadaRoutes)
app.use("/api/auditoria", auditoriaRoutes)
app.use("/api/encuestas", encuestaRoutes)
app.use("/api/estadisticas", estadisticasRoutes)
app.use("/api/especialidad", especialidadRoutes)
app.use("/api/visita-tecnica", visitaRoutes)

// ninguna ruta de arriba matcheo — recurso de la API inexistente
app.use("/api", (req, res) => {
    responder(res, 404, { message: "Recurso no encontrado." });
});

// manejador de errores global: sin esto, cualquier next(error) (por ejemplo
// el 403 que dispara verificarRol cuando el rol no coincide) caia en el
// manejador por defecto de Express, que devuelve HTML en vez del contrato
// { success, message } que espera apiFetch en todo el frontend.
app.use((err, req, res, next) => {
    responder(res, err.status || 500, {
        message: err.message || "Error interno del servidor"
    });
});

module.exports = app;