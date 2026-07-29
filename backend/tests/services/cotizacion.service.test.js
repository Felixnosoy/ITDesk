jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const cotizacionService = require("../../src/services/cotizacion.service");

// Maquina de estado: Pendiente es el unico estado desde el que se puede
// salir. Una vez Aprobada/Rechazada/Vencida queda bloqueada para siempre
// (igual que un ticket Cerrado) — esta es la regla de negocio mas delicada
// de todo el modulo de cotizaciones, vale la pena blindarla con tests.
describe("cotizacion.service.cambiarEstadoCotizacion", () => {
    test("rechaza un estado que no exista en la lista de estados validos", async () => {
        await expect(cotizacionService.cambiarEstadoCotizacion(1, "Cancelada"))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza con 404 si la cotizacion no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(cotizacionService.cambiarEstadoCotizacion(999, "Aprobada"))
            .rejects.toMatchObject({ status: 404 });
    });

    test("rechaza con 409 si la cotizacion ya no esta Pendiente (no se puede recambiar)", async () => {
        pool.query.mockResolvedValueOnce([[{ id_cotizacion: 1, estado: "Aprobada" }]]);

        await expect(cotizacionService.cambiarEstadoCotizacion(1, "Rechazada"))
            .rejects.toMatchObject({ status: 409 });
    });

    test("permite Pendiente -> Aprobada", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_cotizacion: 1, estado: "Pendiente" }]]) // obtenerCotizacionPorId
            .mockResolvedValueOnce([{}])                                          // UPDATE
            .mockResolvedValueOnce([[{ id_cotizacion: 1, estado: "Aprobada" }]]); // SELECT final

        const cotizacion = await cotizacionService.cambiarEstadoCotizacion(1, "Aprobada");

        expect(cotizacion.estado).toBe("Aprobada");
    });

    test("permite Pendiente -> Rechazada", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_cotizacion: 2, estado: "Pendiente" }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_cotizacion: 2, estado: "Rechazada" }]]);

        const cotizacion = await cotizacionService.cambiarEstadoCotizacion(2, "Rechazada");

        expect(cotizacion.estado).toBe("Rechazada");
    });
});

describe("cotizacion.service.actualizarDescuentoTotal", () => {
    test("rechaza un descuento negativo", async () => {
        await expect(cotizacionService.actualizarDescuentoTotal(1, -50))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza modificar el descuento de una cotizacion que no esta Pendiente", async () => {
        pool.query.mockResolvedValueOnce([[{ id_cotizacion: 1, estado: "Aprobada" }]]);

        await expect(cotizacionService.actualizarDescuentoTotal(1, 100))
            .rejects.toMatchObject({ status: 409 });
    });
});
