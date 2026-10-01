const app = require("../../src/app");
const pool = require("../../src/config/database");

const CLAVE = "Prueba123!";

const CUENTAS = {
    administrador: "administrador.prueba@itdesk.test",
    recepcionista: "recepcionista.prueba@itdesk.test",
    tecnico: "tecnico.prueba@itdesk.test",
    cliente: "cliente.prueba@itdesk.test",
    maria: "maria.gomez@correo.test"
};

// Levanta la API en un puerto libre y devuelve como pedirle cosas.
// tokens trae una sesion iniciada por cada cuenta de prueba.
const iniciarApi = async () => {
    const servidor = await new Promise((resolver) => {
        const s = app.listen(0, () => resolver(s));
    });
    const base = `http://localhost:${servidor.address().port}/api`;

    const pedir = async (metodo, ruta, token, cuerpo) => {
        const esFormData = cuerpo instanceof FormData;
        const respuesta = await fetch(base + ruta, {
            method: metodo,
            headers: {
                ...(cuerpo && !esFormData ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: cuerpo ? (esFormData ? cuerpo : JSON.stringify(cuerpo)) : undefined
        });
        const tipo = respuesta.headers.get("content-type") || "";
        const body = tipo.includes("json")
            ? await respuesta.json()
            : Buffer.from(await respuesta.arrayBuffer());

        return { status: respuesta.status, tipo, body };
    };

    const tokens = {};
    for (const [nombre, correo] of Object.entries(CUENTAS)) {
        const { body } = await pedir("POST", "/auth/login", null, { correo, "contraseña": CLAVE });
        tokens[nombre] = body.data.token;
    }

    const cerrar = async () => {
        await new Promise((resolver) => servidor.close(resolver));
        await pool.end();
    };

    return { pedir, tokens, cerrar };
};

// id de un ticket de datos-prueba.sql por su titulo
const idTicket = async (titulo) => {
    const [[fila]] = await pool.query("SELECT id_ticket FROM ticket WHERE titulo = ?", [titulo]);
    return fila.id_ticket;
};

module.exports = { iniciarApi, idTicket, pool };
