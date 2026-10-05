// HU14-HU17: cotizacion, decision del cliente, factura y pago contra la
// API y la base reales. Cada prueba arma su propio ticket nuevo para no
// depender del estado en que otras pruebas dejaron los de ejemplo.
const { iniciarApi, pool } = require("./apoyo");

let api;
let ids;

const LINEAS = [
    { descripcion: "Placa madre", cantidad: 1, precio_unitario: 4500 },
    { descripcion: "Mano de obra", cantidad: 2, precio_unitario: 750.25 }
];

const idPorCorreo = async (correo) => {
    const [[fila]] = await pool.query("SELECT id_usuario FROM usuario WHERE correo = ?", [correo]);
    return fila.id_usuario;
};

// ticket nuevo de cliente.prueba, ya con diagnostico si se pide
const nuevoTicket = async ({ conDiagnostico = true } = {}) => {
    const { body } = await api.pedir("POST", "/tickets", api.tokens.recepcionista, {
        id_cliente: ids.cliente,
        id_equipo: ids.equipo,
        id_tecnico: ids.tecnico,
        titulo: "Ticket de prueba de cotizacion",
        descripcion: "Creado por las pruebas de integracion.",
        prioridad: "Media",
        categoria: "Hardware"
    });
    const id = body.data.id_ticket;

    if (conDiagnostico) {
        await api.pedir("PUT", `/tickets/${id}/diagnostico`, api.tokens.tecnico, { diagnostico: "Placa madre dañada." });
    }

    return id;
};

const cotizar = (idTicket, token = api.tokens.tecnico, lineas = LINEAS) =>
    api.pedir("POST", `/tickets/${idTicket}/cotizaciones`, token, { lineas });

beforeAll(async () => {
    api = await iniciarApi();
    const cliente = await idPorCorreo("cliente.prueba@itdesk.test");
    const [[equipo]] = await pool.query("SELECT id_equipo FROM equipo WHERE id_usuario = ? LIMIT 1", [cliente]);

    ids = {
        cliente,
        equipo: equipo.id_equipo,
        tecnico: await idPorCorreo("tecnico.prueba@itdesk.test")
    };
});

afterAll(async () => {
    await api.cerrar();
});

describe("HU14: crear una cotizacion", () => {
    test("el total lo calcula el servidor y el ticket pasa a Esperando aprobacion", async () => {
        const id = await nuevoTicket();
        const { status, body } = await cotizar(id);

        expect(status).toBe(201);
        expect(body.data).toEqual(expect.objectContaining({
            estado: "Pendiente",
            subtotal: 6000.5,
            itbis: 1080.09,
            total: 7080.59
        }));
        expect(body.data.lineas.map((l) => l.importe)).toEqual([4500, 1500.5]);

        const detalle = await api.pedir("GET", `/tickets/${id}`, api.tokens.tecnico);
        expect(detalle.body.data.ticket.estado).toBe("Esperando aprobacion");
        expect(detalle.body.data.cotizable).toBe(false);
        expect(detalle.body.data.actualizaciones.at(-1)).toEqual(expect.objectContaining({ tipo: "Estado", estado: "Esperando aprobacion" }));
    });

    test("sin diagnostico responde 400", async () => {
        const id = await nuevoTicket({ conDiagnostico: false });
        const { status, body } = await cotizar(id);

        expect(status).toBe(400);
        expect(body.message).toMatch(/diagnóstico/);
    });

    test("no deja una segunda cotizacion mientras la primera esta pendiente", async () => {
        const id = await nuevoTicket();
        await cotizar(id);

        const { status } = await cotizar(id);

        expect(status).toBe(409);
    });

    test.each(["cliente", "recepcionista"])("%s no puede cotizar", async (cuenta) => {
        const id = await nuevoTicket();
        const { status } = await cotizar(id, api.tokens[cuenta]);

        expect(status).toBe(403);
    });

    test("el cliente dueño ve la cotizacion con sus lineas y otro cliente no", async () => {
        const id = await nuevoTicket();
        await cotizar(id);

        const propio = await api.pedir("GET", `/tickets/${id}`, api.tokens.cliente);
        expect(propio.body.data.cotizaciones).toHaveLength(1);
        expect(propio.body.data.cotizaciones[0].lineas).toHaveLength(2);

        const lista = await api.pedir("GET", `/tickets/${id}/cotizaciones`, api.tokens.cliente);
        expect(lista.status).toBe(200);
        expect(lista.body.data).toHaveLength(1);

        const ajeno = await api.pedir("GET", `/tickets/${id}/cotizaciones`, api.tokens.maria);
        expect(ajeno.status).toBe(404);
    });
});
