jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const healthService = require("../../src/services/health.service");

describe("health.service.obtenerEstado", () => {
    afterEach(() => jest.useRealTimers());

    test("con la base respondiendo informa ok", async () => {
        pool.query.mockResolvedValueOnce([[{ 1: 1 }]]);

        const estado = await healthService.obtenerEstado();

        expect(estado).toEqual(expect.objectContaining({ estado: "ok", base_de_datos: "disponible" }));
        expect(estado.activo_desde_segundos).toEqual(expect.any(Number));
    });

    test("si la consulta falla informa la base como no disponible sin el detalle del error", async () => {
        pool.query.mockRejectedValueOnce(new Error("Access denied for user 'root'@'localhost'"));

        const estado = await healthService.obtenerEstado();

        expect(estado).toEqual(expect.objectContaining({ estado: "degradado", base_de_datos: "no disponible" }));
        expect(JSON.stringify(estado)).not.toContain("Access denied");
    });

    test("si la base no contesta en 3 segundos no deja colgada la respuesta", async () => {
        jest.useFakeTimers();
        pool.query.mockReturnValueOnce(new Promise(() => {}));

        const pendiente = healthService.obtenerEstado();
        await jest.advanceTimersByTimeAsync(3000);

        await expect(pendiente).resolves.toEqual(expect.objectContaining({ base_de_datos: "no disponible" }));
    });
});
