jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const facturaService = require("../../src/services/factura.service");

const tecnico = { id_usuario: 3, rol: "Tecnico" };
const ticket = (estado = "En reparacion", id_usuario = 5) => [[{ id_ticket: 10, id_usuario, estado }]];
const aprobada = [{ id_cotizacion: 7, subtotal: "1000.00", itbis: "180.00", total: "1180.00" }];

const sqlDe = (texto) => pool.query.mock.calls.find(([sql]) => sql.includes(texto));

// respuestas de generarFactura hasta buscar la factura existente
const hastaVerificar = ({ cotizaciones = aprobada, existentes = [] } = {}) => {
    pool.query
        .mockResolvedValueOnce(ticket())
        .mockResolvedValueOnce([[]])               // SELECT ... FOR UPDATE
        .mockResolvedValueOnce([cotizaciones]);

    if (cotizaciones.length > 0) pool.query.mockResolvedValueOnce([existentes]);
};

describe("factura.service.generarFactura", () => {
    test("sin cotizacion aprobada se rechaza y deshace", async () => {
        hastaVerificar({ cotizaciones: [] });

        await expect(facturaService.generarFactura("10", tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("aprobada") });

        expect(pool.conexion.rollback).toHaveBeenCalled();
        expect(sqlDe("INSERT INTO factura")).toBeUndefined();
    });

    test("una cotizacion ya facturada responde 409", async () => {
        hastaVerificar({ existentes: [{ id_factura: 1 }] });

        await expect(facturaService.generarFactura("10", tecnico))
            .rejects.toMatchObject({ status: 409 });
    });

    test("un ticket cerrado no se factura", async () => {
        pool.query.mockResolvedValueOnce(ticket("Cerrado"));

        await expect(facturaService.generarFactura("10", tecnico))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.getConnection).not.toHaveBeenCalled();
    });

    test("copia los montos y las lineas de la cotizacion aprobada", async () => {
        hastaVerificar();
        pool.query
            .mockResolvedValueOnce([{ insertId: 4 }])   // INSERT factura
            .mockResolvedValueOnce([{}])                // INSERT lineas
            .mockResolvedValueOnce([{}])                // INSERT actualizacion
            .mockResolvedValueOnce([[{ id_factura: 4, id_ticket: 10, total: "1180.00" }]])
            .mockResolvedValueOnce([[{ id_linea: 1, precio_unitario: "1000.00", importe: "1000.00" }]]);

        const factura = await facturaService.generarFactura("10", tecnico);

        expect(sqlDe("INSERT INTO factura ")[1]).toEqual([7, 10, 3, "1000.00", "180.00", "1180.00"]);
        expect(sqlDe("INSERT INTO factura_linea")[0]).toContain("FROM cotizacion_linea");
        expect(sqlDe("INSERT INTO factura_linea")[1]).toEqual([4, 7]);
        expect(pool.conexion.commit).toHaveBeenCalled();
        expect(factura.total).toBe(1180);
        expect(factura.lineas[0].importe).toBe(1000);
    });
});

describe("factura.service.consultarFactura", () => {
    test("un ticket sin factura responde 404", async () => {
        pool.query
            .mockResolvedValueOnce(ticket())
            .mockResolvedValueOnce([[]]);

        await expect(facturaService.consultarFactura("10", tecnico))
            .rejects.toMatchObject({ status: 404, message: expect.stringContaining("factura") });
    });

    test("un cliente no ve la factura de un ticket ajeno", async () => {
        pool.query.mockResolvedValueOnce(ticket("En reparacion", 99));

        await expect(facturaService.consultarFactura("10", { id_usuario: 5, rol: "Cliente" }))
            .rejects.toMatchObject({ status: 404, message: "Ticket no encontrado." });
    });
});
