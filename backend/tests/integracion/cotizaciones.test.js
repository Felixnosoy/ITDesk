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

// ticket con una cotizacion pendiente recien creada
const ticketCotizado = async () => {
    const id = await nuevoTicket();
    const { body } = await cotizar(id);
    return { id, idCotizacion: body.data.id_cotizacion };
};

const decidir = (id, idCotizacion, datos, token = api.tokens.cliente) =>
    api.pedir("PATCH", `/tickets/${id}/cotizaciones/${idCotizacion}`, token, datos);

describe("HU15: aprobar o rechazar la cotizacion", () => {
    test("el cliente aprueba y el ticket pasa a En reparacion", async () => {
        const { id, idCotizacion } = await ticketCotizado();
        const { status, body } = await decidir(id, idCotizacion, { estado: "Aprobada" });

        expect(status).toBe(200);
        expect(body.data.estado).toBe("Aprobada");
        expect(body.data.fecha_decision).not.toBeNull();

        const detalle = await api.pedir("GET", `/tickets/${id}`, api.tokens.cliente);
        expect(detalle.body.data.ticket.estado).toBe("En reparacion");
    });

    test("un rechazo deja el ticket en diagnostico y se puede recotizar", async () => {
        const { id, idCotizacion } = await ticketCotizado();
        const { body } = await decidir(id, idCotizacion, { estado: "Rechazada", motivo: "Muy caro" });

        expect(body.data).toEqual(expect.objectContaining({ estado: "Rechazada", motivo_rechazo: "Muy caro" }));

        const detalle = await api.pedir("GET", `/tickets/${id}`, api.tokens.tecnico);
        expect(detalle.body.data.ticket.estado).toBe("En diagnostico");
        expect(detalle.body.data.cotizable).toBe(true);

        const nueva = await cotizar(id, api.tokens.tecnico, [{ descripcion: "Repuesto generico", cantidad: 1, precio_unitario: 2000 }]);
        expect(nueva.status).toBe(201);

        const lista = await api.pedir("GET", `/tickets/${id}/cotizaciones`, api.tokens.cliente);
        expect(lista.body.data.map((c) => c.estado)).toEqual(["Pendiente", "Rechazada"]);
    });

    test("no se puede decidir dos veces", async () => {
        const { id, idCotizacion } = await ticketCotizado();
        await decidir(id, idCotizacion, { estado: "Aprobada" });

        const { status } = await decidir(id, idCotizacion, { estado: "Rechazada" });

        expect(status).toBe(409);
    });

    test("otro cliente no puede decidir sobre ella", async () => {
        const { id, idCotizacion } = await ticketCotizado();
        const { status } = await decidir(id, idCotizacion, { estado: "Aprobada" }, api.tokens.maria);

        expect(status).toBe(404);
    });

    test.each(["tecnico", "administrador"])("%s no decide por el cliente", async (cuenta) => {
        const { id, idCotizacion } = await ticketCotizado();
        const { status } = await decidir(id, idCotizacion, { estado: "Aprobada" }, api.tokens[cuenta]);

        expect(status).toBe(403);
    });

    test("el tecnico no puede sacar el ticket de Esperando aprobacion a mano", async () => {
        const { id } = await ticketCotizado();
        const { status, body } = await api.pedir("PATCH", `/tickets/${id}/estado`, api.tokens.tecnico, { estado: "En reparacion" });

        expect(status).toBe(400);
        expect(body.message).toMatch(/decisión del cliente/);
    });
});

// ticket con su cotizacion ya aprobada por el cliente
const ticketAprobado = async () => {
    const { id, idCotizacion } = await ticketCotizado();
    await decidir(id, idCotizacion, { estado: "Aprobada" });
    return id;
};

const facturar = (id, token = api.tokens.tecnico) => api.pedir("POST", `/tickets/${id}/factura`, token);

describe("HU16: generar la factura", () => {
    test("copia las lineas y el total de la cotizacion aprobada", async () => {
        const id = await ticketAprobado();
        const { status, body } = await facturar(id);

        expect(status).toBe(201);
        expect(body.data).toEqual(expect.objectContaining({ subtotal: 6000.5, itbis: 1080.09, total: 7080.59 }));
        expect(body.data.lineas.map((l) => [l.descripcion, l.cantidad, l.importe])).toEqual([
            ["Placa madre", 1, 4500],
            ["Mano de obra", 2, 1500.5]
        ]);
    });

    test("el administrador tambien puede facturar", async () => {
        const id = await ticketAprobado();
        const { status } = await facturar(id, api.tokens.administrador);

        expect(status).toBe(201);
    });

    test("con la cotizacion pendiente o rechazada se rechaza", async () => {
        const { id, idCotizacion } = await ticketCotizado();
        expect((await facturar(id)).status).toBe(400);

        await decidir(id, idCotizacion, { estado: "Rechazada" });
        expect((await facturar(id)).status).toBe(400);
    });

    test("no se factura dos veces", async () => {
        const id = await ticketAprobado();
        await facturar(id);

        expect((await facturar(id)).status).toBe(409);
    });

    test.each(["cliente", "recepcionista"])("%s no puede facturar", async (cuenta) => {
        const id = await ticketAprobado();

        expect((await facturar(id, api.tokens[cuenta])).status).toBe(403);
    });

    test("con la factura emitida el ticket se resuelve sin declarar la excepcion", async () => {
        const id = await ticketAprobado();

        const antes = await api.pedir("PATCH", `/tickets/${id}/estado`, api.tokens.tecnico, { estado: "Resuelto" });
        expect(antes.status).toBe(400);

        await facturar(id);
        const despues = await api.pedir("PATCH", `/tickets/${id}/estado`, api.tokens.tecnico, { estado: "Resuelto" });

        expect(despues.status).toBe(200);
        expect(despues.body.data).toEqual(expect.objectContaining({ estado: "Resuelto", resuelto_sin_costo: 0 }));
    });

    test("el cliente consulta su factura y otro cliente no", async () => {
        const id = await ticketAprobado();
        await facturar(id);

        const propia = await api.pedir("GET", `/tickets/${id}/factura`, api.tokens.cliente);
        expect(propia.status).toBe(200);
        expect(propia.body.data.total).toBe(7080.59);

        const detalle = await api.pedir("GET", `/tickets/${id}`, api.tokens.cliente);
        expect(detalle.body.data.factura.id_factura).toBe(propia.body.data.id_factura);
        expect(detalle.body.data).not.toHaveProperty("facturable");

        expect((await api.pedir("GET", `/tickets/${id}/factura`, api.tokens.maria)).status).toBe(404);
    });

    test("el taller ve facturable solo mientras falta la factura", async () => {
        const id = await ticketAprobado();

        const antes = await api.pedir("GET", `/tickets/${id}`, api.tokens.tecnico);
        expect(antes.body.data.facturable).toBe(true);

        await facturar(id);
        const despues = await api.pedir("GET", `/tickets/${id}`, api.tokens.tecnico);
        expect(despues.body.data.facturable).toBe(false);
    });
});
