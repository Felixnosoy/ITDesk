jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const facturaService = require("../../src/services/factura.service");

// A diferencia de cotizacion (un solo estado de salida bloquea todo),
// factura tiene un estado NO terminal en el medio: Vencida todavia puede
// pasar a Pagada o Anulada. Pagada/Anulada si son terminales. Esta
// asimetria es justo el tipo de regla que un cambio futuro podria romper
// sin darse cuenta.
describe("factura.service.cambiarEstadoFactura", () => {
    test("rechaza un estado fuera de Pagada/Anulada/Vencida", async () => {
        await expect(facturaService.cambiarEstadoFactura(1, "Pendiente"))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza con 404 si la factura no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(facturaService.cambiarEstadoFactura(999, "Pagada"))
            .rejects.toMatchObject({ status: 404 });
    });

    test("rechaza con 409 si la factura ya esta Pagada (estado terminal)", async () => {
        pool.query.mockResolvedValueOnce([[{ id_factura: 1, estado: "Pagada" }]]);

        await expect(facturaService.cambiarEstadoFactura(1, "Anulada"))
            .rejects.toMatchObject({ status: 409 });
    });

    test("rechaza con 409 si la factura ya esta Anulada (estado terminal)", async () => {
        pool.query.mockResolvedValueOnce([[{ id_factura: 1, estado: "Anulada" }]]);

        await expect(facturaService.cambiarEstadoFactura(1, "Pagada"))
            .rejects.toMatchObject({ status: 409 });
    });

    test("permite Pendiente -> Vencida", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_factura: 1, estado: "Pendiente" }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_factura: 1, estado: "Vencida" }]]);

        const factura = await facturaService.cambiarEstadoFactura(1, "Vencida");

        expect(factura.estado).toBe("Vencida");
    });

    test("Vencida NO es terminal: todavia puede pasar a Pagada", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_factura: 1, estado: "Vencida" }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_factura: 1, estado: "Pagada" }]]);

        const factura = await facturaService.cambiarEstadoFactura(1, "Pagada");

        expect(factura.estado).toBe("Pagada");
    });
});
