const { validarEntorno, esProduccion } = require("./config/entorno");

try {
    validarEntorno();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}

const app = require("./app");

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
    console.log(`API escuchando en el puerto ${PORT} (${esProduccion() ? "producción" : "desarrollo"})`);
});
