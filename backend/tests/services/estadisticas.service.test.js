jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const estadisticasService = require("../../src/services/estadisticas.service");

describe("estadisticas.service.obtenerEstadisticasPublicas", () => {
    test("calcula el porcentaje de resueltos con un decimal como maximo", async () => {
        pool.query.mockResolvedValueOnce([[{
            total_tickets: 10,
            clientes_activos: 2,
            tecnicos_especializados: 1,
            tickets_resueltos: 4
        }]]);

        const resultado = await estadisticasService.obtenerEstadisticasPublicas();

        expect(resultado).toEqual({
            tickets_registrados: 10,
            clientes_activos: 2,
            tecnicos_especializados: 1,
            porcentaje_resueltos: 40
        });
    });

    test("redondea a un decimal cuando no da un numero entero", async () => {
        pool.query.mockResolvedValueOnce([[{
            total_tickets: 3,
            clientes_activos: 0,
            tecnicos_especializados: 0,
            tickets_resueltos: 2
        }]]);

        const resultado = await estadisticasService.obtenerEstadisticasPublicas();

        expect(resultado.porcentaje_resueltos).toBeCloseTo(66.7, 1);
    });

    test("no divide por cero: 0 tickets da 0% de resueltos", async () => {
        pool.query.mockResolvedValueOnce([[{
            total_tickets: 0,
            clientes_activos: 0,
            tecnicos_especializados: 0,
            tickets_resueltos: 0
        }]]);

        const resultado = await estadisticasService.obtenerEstadisticasPublicas();

        expect(resultado.porcentaje_resueltos).toBe(0);
        expect(resultado.tickets_registrados).toBe(0);
    });
});
