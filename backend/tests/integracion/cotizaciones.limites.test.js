// HU14.6, HU15.5, HU16.5 y HU17.6: casos limite de cotizacion, decision,
// factura y pago contra la API y la base reales. cotizaciones.test.js
// prueba el camino normal; aca van los clics simultaneos, los montos con
// decimales que el punto flotante suma mal y los ids cruzados entre
// clientes. Cada prueba arma su propio ticket nuevo.
const { iniciarApi, pool } = require("./apoyo");

let api;
let ids;

// 0.1 * 3 y 33.33 * 3 son las sumas que en punto flotante no dan exacto
const LINEAS_CON_DECIMALES = [
    { descripcion: "Tornillos", cantidad: 3, precio_unitario: 0.1 },
    { descripcion: "Pasta termica", cantidad: 1, precio_unitario: 0.2 },
    { descripcion: "Cable SATA", cantidad: 3, precio_unitario: 33.33 },
    { descripcion: "Ventilador", cantidad: 7, precio_unitario: 19.99 }
];

const LINEAS = [{ descripcion: "Mano de obra", cantidad: 1, precio_unitario: 1000 }];

const TARJETA = {
    numero_tarjeta: "4242 4242 4242 4242",
    titular: "Cliente Prueba",
    vencimiento: "12/30",
    cvv: "123"
};

const aCentavos = (monto) => Math.round(Number(monto) * 100);

const idPorCorreo = async (correo) => {
    const [[fila]] = await pool.query("SELECT id_usuario FROM usuario WHERE correo = ?", [correo]);
    return fila.id_usuario;
};

const equipoDe = async (idCliente) => {
    const [[fila]] = await pool.query("SELECT id_equipo FROM equipo WHERE id_usuario = ? LIMIT 1", [idCliente]);
    return fila.id_equipo;
};

// ticket nuevo con diagnostico; por defecto de cliente.prueba
const nuevoTicket = async ({ cliente = "cliente", conDiagnostico = true } = {}) => {
    const { body } = await api.pedir("POST", "/tickets", api.tokens.recepcionista, {
        id_cliente: ids[cliente].id,
        id_equipo: ids[cliente].equipo,
        id_tecnico: ids.tecnico,
        titulo: "Ticket de prueba de casos limite",
        descripcion: "Creado por las pruebas de integracion.",
        prioridad: "Media",
        categoria: "Hardware"
    });
    const id = body.data.id_ticket;

    if (conDiagnostico) {
        await api.pedir("PUT", `/tickets/${id}/diagnostico`, api.tokens.tecnico, { diagnostico: "Equipo con fallas varias." });
    }

    return id;
};

const cotizar = (id, lineas = LINEAS, extra = {}) =>
    api.pedir("POST", `/tickets/${id}/cotizaciones`, api.tokens.tecnico, { lineas, ...extra });

const decidir = (id, idCotizacion, datos, token = api.tokens.cliente) =>
    api.pedir("PATCH", `/tickets/${id}/cotizaciones/${idCotizacion}`, token, datos);

const facturar = (id) => api.pedir("POST", `/tickets/${id}/factura`, api.tokens.tecnico);

const pagar = (id) => api.pedir("POST", `/tickets/${id}/factura/pago`, api.tokens.cliente, TARJETA);

const estadoDelTicket = async (id) => {
    const [[fila]] = await pool.query("SELECT estado FROM ticket WHERE id_ticket = ?", [id]);
    return fila.estado;
};

// las dos respuestas de un par simultaneo, ordenadas por codigo
const codigos = (respuestas) => respuestas.map((r) => r.status).sort();

beforeAll(async () => {
    api = await iniciarApi();
    const cliente = await idPorCorreo("cliente.prueba@itdesk.test");
    const maria = await idPorCorreo("maria.gomez@correo.test");

    ids = {
        cliente: { id: cliente, equipo: await equipoDe(cliente) },
        maria: { id: maria, equipo: await equipoDe(maria) },
        tecnico: await idPorCorreo("tecnico.prueba@itdesk.test")
    };
});

afterAll(async () => {
    await api.cerrar();
});

describe("HU14.6: pruebas de cotizacion", () => {
    test("el total coincide con la suma de las lineas aunque los precios tengan decimales", async () => {
        const id = await nuevoTicket();
        const { status, body } = await cotizar(id, LINEAS_CON_DECIMALES);

        expect(status).toBe(201);
        expect(body.data.lineas.map((l) => l.importe)).toEqual([0.3, 0.2, 99.99, 139.93]);
        expect(body.data).toEqual(expect.objectContaining({ subtotal: 240.42, itbis: 43.28, total: 283.7 }));

        // y lo guardado en la base cuadra al centavo, no solo la respuesta
        const [[guardada]] = await pool.query(
            "SELECT subtotal, itbis, total FROM cotizacion WHERE id_cotizacion = ?",
            [body.data.id_cotizacion]
        );
        const [lineas] = await pool.query(
            "SELECT importe FROM cotizacion_linea WHERE id_cotizacion = ?",
            [body.data.id_cotizacion]
        );
        const sumaLineas = lineas.reduce((suma, l) => suma + aCentavos(l.importe), 0);

        expect(aCentavos(guardada.subtotal)).toBe(sumaLineas);
        expect(aCentavos(guardada.total)).toBe(aCentavos(guardada.subtotal) + aCentavos(guardada.itbis));
    });

    test("ignora el importe y el total que mande el frontend", async () => {
        const id = await nuevoTicket();
        const { body } = await cotizar(
            id,
            [{ descripcion: "Disco SSD", cantidad: 2, precio_unitario: 2500, importe: 1 }],
            { subtotal: 1, itbis: 0, total: 1 }
        );

        expect(body.data.lineas[0].importe).toBe(5000);
        expect(body.data).toEqual(expect.objectContaining({ subtotal: 5000, itbis: 900, total: 5900 }));
    });

    test("sin diagnostico no se crea nada y el ticket no cambia de estado", async () => {
        const id = await nuevoTicket({ conDiagnostico: false });
        const { status } = await cotizar(id);

        expect(status).toBe(400);
        const [cotizaciones] = await pool.query("SELECT id_cotizacion FROM cotizacion WHERE id_ticket = ?", [id]);
        expect(cotizaciones).toHaveLength(0);
        expect(await estadoDelTicket(id)).toBe("Abierto");
    });

    test("dos cotizaciones enviadas a la vez dejan solo una", async () => {
        const id = await nuevoTicket();
        const respuestas = await Promise.all([cotizar(id), cotizar(id)]);

        expect(codigos(respuestas)).toEqual([201, 409]);
        const [cotizaciones] = await pool.query("SELECT id_cotizacion FROM cotizacion WHERE id_ticket = ?", [id]);
        expect(cotizaciones).toHaveLength(1);
    });
});

describe("HU15.5: pruebas de aprobacion y rechazo", () => {
    test("un cliente no decide sobre la cotizacion de otro aunque use su propio ticket", async () => {
        const idMaria = await nuevoTicket({ cliente: "maria" });
        const ajena = await cotizar(idMaria);
        const idPropio = await nuevoTicket();
        await cotizar(idPropio);

        // ticket propio en la ruta, cotizacion de Maria en el id
        const cruzada = await decidir(idPropio, ajena.body.data.id_cotizacion, { estado: "Rechazada" });
        expect(cruzada.status).toBe(404);

        const [[cotizacion]] = await pool.query("SELECT estado FROM cotizacion WHERE id_cotizacion = ?", [ajena.body.data.id_cotizacion]);
        expect(cotizacion.estado).toBe("Pendiente");
        expect(await estadoDelTicket(idMaria)).toBe("Esperando aprobacion");
        expect(await estadoDelTicket(idPropio)).toBe("Esperando aprobacion");
    });

    test("aprobar y rechazar a la vez deja una sola decision y el ticket acorde a ella", async () => {
        const id = await nuevoTicket();
        const { body } = await cotizar(id);
        const idCotizacion = body.data.id_cotizacion;

        const respuestas = await Promise.all([
            decidir(id, idCotizacion, { estado: "Aprobada" }),
            decidir(id, idCotizacion, { estado: "Rechazada" })
        ]);

        expect(codigos(respuestas)).toEqual([200, 409]);
        const ganadora = respuestas.find((r) => r.status === 200).body.data.estado;
        const esperado = ganadora === "Aprobada" ? "En reparacion" : "En diagnostico";
        expect(await estadoDelTicket(id)).toBe(esperado);

        const [decisiones] = await pool.query(
            "SELECT id_actualizacion FROM actualizacion WHERE id_ticket = ? AND observaciones LIKE 'El cliente %cotización%'",
            [id]
        );
        expect(decisiones).toHaveLength(1);
    });
});

describe("HU16.5: pruebas de facturacion", () => {
    test("el total de la factura iguala al de la cotizacion y a la suma de sus lineas", async () => {
        const id = await nuevoTicket();
        const { body } = await cotizar(id, LINEAS_CON_DECIMALES);
        await decidir(id, body.data.id_cotizacion, { estado: "Aprobada" });

        const factura = await facturar(id);
        expect(factura.status).toBe(201);

        const [[guardada]] = await pool.query(
            "SELECT id_factura, subtotal, itbis, total FROM factura WHERE id_ticket = ?",
            [id]
        );
        const [lineas] = await pool.query("SELECT importe FROM factura_linea WHERE id_factura = ?", [guardada.id_factura]);

        expect(aCentavos(guardada.total)).toBe(aCentavos(body.data.total));
        expect(aCentavos(guardada.subtotal)).toBe(lineas.reduce((suma, l) => suma + aCentavos(l.importe), 0));
        expect(lineas).toHaveLength(LINEAS_CON_DECIMALES.length);
    });

    test("despues de un rechazo se factura la cotizacion nueva, no la rechazada", async () => {
        const id = await nuevoTicket();
        const primera = await cotizar(id, [{ descripcion: "Placa madre", cantidad: 1, precio_unitario: 9000 }]);
        await decidir(id, primera.body.data.id_cotizacion, { estado: "Rechazada", motivo: "Muy caro" });

        // rechazada y sin otra, no se factura
        expect((await facturar(id)).status).toBe(400);

        const segunda = await cotizar(id, [{ descripcion: "Placa madre usada", cantidad: 1, precio_unitario: 5000 }]);
        await decidir(id, segunda.body.data.id_cotizacion, { estado: "Aprobada" });

        const { body } = await facturar(id);
        expect(body.data.id_cotizacion).toBe(segunda.body.data.id_cotizacion);
        expect(body.data.total).toBe(segunda.body.data.total);
        expect(body.data.lineas.map((l) => l.descripcion)).toEqual(["Placa madre usada"]);
    });

    test("dos clics en Generar factura a la vez dejan una sola factura", async () => {
        const id = await nuevoTicket();
        const { body } = await cotizar(id);
        await decidir(id, body.data.id_cotizacion, { estado: "Aprobada" });

        const respuestas = await Promise.all([facturar(id), facturar(id)]);

        expect(codigos(respuestas)).toEqual([201, 409]);
        const [facturas] = await pool.query("SELECT id_factura FROM factura WHERE id_ticket = ?", [id]);
        expect(facturas).toHaveLength(1);
    });
});

describe("HU17.6: pruebas del pago", () => {
    const ticketFacturado = async () => {
        const id = await nuevoTicket();
        const { body } = await cotizar(id);
        await decidir(id, body.data.id_cotizacion, { estado: "Aprobada" });
        await facturar(id);
        return id;
    };

    const pagosRegistrados = async (id) => {
        const [filas] = await pool.query(
            "SELECT id_actualizacion FROM actualizacion WHERE id_ticket = ? AND observaciones LIKE 'El cliente pagó la factura%'",
            [id]
        );
        return filas.length;
    };

    test("un segundo pago se rechaza y no cambia el comprobante del primero", async () => {
        const id = await ticketFacturado();
        const primero = await pagar(id);
        expect(primero.status).toBe(200);

        const segundo = await pagar(id);
        expect(segundo.status).toBe(409);

        const { body } = await api.pedir("GET", `/tickets/${id}/factura`, api.tokens.cliente);
        expect(body.data.referencia_pago).toBe(primero.body.data.referencia_pago);
        expect(body.data.fecha_pago).toBe(primero.body.data.fecha_pago);
        expect(await pagosRegistrados(id)).toBe(1);
    });

    test("dos pagos enviados a la vez cobran una sola vez", async () => {
        const id = await ticketFacturado();
        const respuestas = await Promise.all([pagar(id), pagar(id)]);

        expect(codigos(respuestas)).toEqual([200, 409]);
        const [[factura]] = await pool.query("SELECT referencia_pago FROM factura WHERE id_ticket = ?", [id]);
        expect(factura.referencia_pago).toBe(respuestas.find((r) => r.status === 200).body.data.referencia_pago);
        expect(await pagosRegistrados(id)).toBe(1);
    });
});
