// HU10.6: lo que cada rol puede ver de un ticket. El cliente no ve notas
// privadas ni tickets ajenos, aunque escriba la URL a mano.
const fs = require("fs");
const { iniciarApi, idTicket } = require("./apoyo");

// PNG real de 1x1
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
);

const NOTA_SECRETA = "Nota secreta del taller para la prueba de visibilidad";

let api;
let propio;       // ticket de cliente.prueba con avance, nota e imagenes
let ajeno;        // ticket de maria
let urlPublica;   // imagen de un avance del ticket propio
let urlPrivada;   // imagen de una nota privada del ticket propio

const conImagen = (campos) => {
    const datos = new FormData();
    for (const [clave, valor] of Object.entries(campos)) datos.append(clave, valor);
    datos.append("imagenes", new Blob([PNG], { type: "image/png" }), "evidencia.png");
    return datos;
};

beforeAll(async () => {
    api = await iniciarApi();
    propio = await idTicket("Windows muy lento");
    ajeno = await idTicket("Bateria no carga");

    const avance = await api.pedir("POST", `/tickets/${propio}/actualizaciones`, api.tokens.tecnico, conImagen({ observaciones: "Avance con foto." }));
    const nota = await api.pedir("POST", `/tickets/${propio}/notas`, api.tokens.tecnico, conImagen({ contenido: NOTA_SECRETA }));

    urlPublica = avance.body.data.adjuntos[0].url.replace("/api", "");
    urlPrivada = nota.body.data.adjuntos[0].url.replace("/api", "");
});

afterAll(async () => {
    await api.cerrar();
    fs.rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true });
});

describe("detalle del ticket para el cliente", () => {
    test("abre su propio ticket con diagnostico y linea de tiempo", async () => {
        const { status, body } = await api.pedir("GET", `/tickets/${propio}`, api.tokens.cliente);

        expect(status).toBe(200);
        expect(body.data.ticket.id_ticket).toBe(propio);
        expect(body.data.actualizaciones.length).toBeGreaterThan(0);
        expect(body.data).toHaveProperty("diagnostico");
    });

    test("no recibe notas privadas ni los estados para cambiarlo", async () => {
        const { body } = await api.pedir("GET", `/tickets/${propio}`, api.tokens.cliente);

        expect(body.data).not.toHaveProperty("notas_privadas");
        expect(body.data).not.toHaveProperty("estados_siguientes");
    });

    test("el texto y la imagen de la nota privada no aparecen en ninguna parte", async () => {
        const { body } = await api.pedir("GET", `/tickets/${propio}`, api.tokens.cliente);
        const todo = JSON.stringify(body);

        expect(todo).not.toContain(NOTA_SECRETA);
        expect(todo).not.toContain(urlPrivada);
    });

    test.each([
        ["un ticket ajeno", () => ajeno],
        ["un ticket que no existe", () => 999999]
    ])("al escribir la URL de %s recibe 404, sin distinguir entre los dos", async (caso, id) => {
        const { status, body } = await api.pedir("GET", `/tickets/${id()}`, api.tokens.cliente);

        expect(status).toBe(404);
        expect(body.message).toBe("Ticket no encontrado.");
    });
});

describe("detalle del ticket para el taller", () => {
    test.each(["tecnico", "administrador", "recepcionista"])("%s ve las notas privadas y los estados siguientes", async (cuenta) => {
        const { status, body } = await api.pedir("GET", `/tickets/${propio}`, api.tokens[cuenta]);

        expect(status).toBe(200);
        expect(body.data.notas_privadas.some((n) => n.contenido === NOTA_SECRETA)).toBe(true);
        expect(Array.isArray(body.data.estados_siguientes)).toBe(true);
    });
});

describe("imagenes adjuntas", () => {
    test("el cliente dueño descarga la imagen de un avance", async () => {
        const { status, tipo, body } = await api.pedir("GET", urlPublica, api.tokens.cliente);

        expect(status).toBe(200);
        expect(tipo).toMatch(/^image\/png/);
        expect(body.equals(PNG)).toBe(true);
    });

    test("otro cliente no descarga la imagen de un avance ajeno", async () => {
        const { status } = await api.pedir("GET", urlPublica, api.tokens.maria);

        expect(status).toBe(404);
    });

    test("el cliente dueño no descarga la imagen de una nota privada", async () => {
        const { status } = await api.pedir("GET", urlPrivada, api.tokens.cliente);

        expect(status).toBe(404);
    });

    test("el taller descarga las dos", async () => {
        const publica = await api.pedir("GET", urlPublica, api.tokens.recepcionista);
        const privada = await api.pedir("GET", urlPrivada, api.tokens.tecnico);

        expect([publica.status, privada.status]).toEqual([200, 200]);
    });

    test("sin sesion no se descarga nada", async () => {
        const { status } = await api.pedir("GET", urlPublica);

        expect(status).toBe(401);
    });
});

describe("el cliente no escribe en el ticket", () => {
    test.each([
        ["un avance", "POST", "actualizaciones", { observaciones: "x" }],
        ["una nota privada", "POST", "notas", { contenido: "x" }],
        ["el diagnostico", "PUT", "diagnostico", { diagnostico: "x" }],
        ["el estado", "PATCH", "estado", { estado: "En reparacion" }]
    ])("no puede registrar %s ni en su propio ticket (403)", async (caso, metodo, ruta, cuerpo) => {
        const { status } = await api.pedir(metodo, `/tickets/${propio}/${ruta}`, api.tokens.cliente, cuerpo);

        expect(status).toBe(403);
    });
});
