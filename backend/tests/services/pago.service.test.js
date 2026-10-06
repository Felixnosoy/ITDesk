jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const pagoService = require("../../src/services/pago.service");

const cliente = { id_usuario: 5, rol: "Cliente" };
const ticket = (id_usuario = 5) => [[{ id_ticket: 10, id_usuario, estado: "Resuelto" }]];

const TARJETA = {
    numero_tarjeta: "4242 4242 4242 4242",
    titular: "Cliente Prueba",
    vencimiento: "12/30",
    cvv: "123"
};

const sqlDe = (texto) => pool.query.mock.calls.find(([sql]) => sql.includes(texto));

describe("pago.service.validarTarjeta", () => {
    const hoy = new Date(2026, 9, 5); // 5 de octubre de 2026

    test("acepta la tarjeta de prueba con espacios o guiones y devuelve solo los ultimos 4", () => {
        expect(pagoService.validarTarjeta({ ...TARJETA, numero_tarjeta: "4242-4242-4242-4242" }, hoy))
            .toEqual({ ultimos4: "4242", aprobada: true });
    });

    test.each([
        ["un numero corto", { numero_tarjeta: "4242" }, "16 dígitos"],
        ["una tarjeta que no es de prueba", { numero_tarjeta: "5555 5555 5555 4444" }, "modo de prueba"],
        ["sin titular", { titular: " " }, "titular"],
        ["vencimiento sin formato", { vencimiento: "2030-12" }, "MM/AA"],
        ["mes 13", { vencimiento: "13/30" }, "MM/AA"],
        ["vencida", { vencimiento: "09/26" }, "vencida"],
        ["cvv de 2 digitos", { cvv: "12" }, "cvv"],
        ["cvv numerico", { cvv: 123 }, "cvv"]
    ])("rechaza %s", (_caso, cambio, mensaje) => {
        expect(() => pagoService.validarTarjeta({ ...TARJETA, ...cambio }, hoy))
            .toThrow(expect.objectContaining({ status: 400, message: expect.stringContaining(mensaje) }));
    });

    test("la tarjeta vale hasta el ultimo dia de su mes", () => {
        expect(() => pagoService.validarTarjeta({ ...TARJETA, vencimiento: "10/26" }, hoy)).not.toThrow();
    });
});

describe("pago.service.pagarFactura", () => {
    const hastaFactura = (facturas) => {
        pool.query
            .mockResolvedValueOnce(ticket())
            .mockResolvedValueOnce([facturas]);
    };

    test("una tarjeta invalida no consulta la base", async () => {
        await expect(pagoService.pagarFactura("10", { ...TARJETA, cvv: "" }, cliente))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("un cliente no paga la factura de un ticket ajeno", async () => {
        pool.query.mockResolvedValueOnce(ticket(99));

        await expect(pagoService.pagarFactura("10", TARJETA, cliente))
            .rejects.toMatchObject({ status: 404 });

        expect(pool.getConnection).not.toHaveBeenCalled();
    });

    test("sin factura responde 404", async () => {
        hastaFactura([]);

        await expect(pagoService.pagarFactura("10", TARJETA, cliente))
            .rejects.toMatchObject({ status: 404, message: expect.stringContaining("factura") });
    });

    test("una factura ya pagada responde 409 y no cobra", async () => {
        hastaFactura([{ id_factura: 4, estado: "Pagada" }]);

        await expect(pagoService.pagarFactura("10", TARJETA, cliente))
            .rejects.toMatchObject({ status: 409 });

        expect(sqlDe("UPDATE factura")).toBeUndefined();
        expect(pool.conexion.rollback).toHaveBeenCalled();
    });

    test("la tarjeta de rechazo responde 402 y no cambia nada", async () => {
        hastaFactura([{ id_factura: 4, estado: "Pendiente" }]);

        await expect(pagoService.pagarFactura("10", { ...TARJETA, numero_tarjeta: "4000000000000002" }, cliente))
            .rejects.toMatchObject({ status: 402 });

        expect(sqlDe("UPDATE factura")).toBeUndefined();
    });

    test("marca la factura como Pagada sin guardar el numero completo ni el CVV", async () => {
        hastaFactura([{ id_factura: 4, estado: "Pendiente" }]);
        pool.query
            .mockResolvedValueOnce([{}])    // UPDATE factura
            .mockResolvedValueOnce([{}])    // INSERT actualizacion
            .mockResolvedValueOnce([[{ id_factura: 4, id_ticket: 10, estado: "Pagada", total: "1180.00" }]])
            .mockResolvedValueOnce([[]]);

        const factura = await pagoService.pagarFactura("10", TARJETA, cliente);

        const [, parametros] = sqlDe("UPDATE factura");
        expect(parametros).toEqual(["Pagada", expect.stringMatching(/^PAG-[0-9A-F]{10}$/), "4242", 4]);
        expect(JSON.stringify(pool.query.mock.calls)).not.toMatch(/4242424242424242|"123"|12\/30/);
        expect(pool.conexion.commit).toHaveBeenCalled();
        expect(factura.estado).toBe("Pagada");
    });
});
