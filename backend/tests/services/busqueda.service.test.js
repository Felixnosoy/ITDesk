jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const busquedaService = require("../../src/services/busqueda.service");

const cliente = { id_usuario: 5, rol: "Cliente" };
const tecnico = { id_usuario: 3, rol: "Tecnico" };
const administrador = { id_usuario: 1, rol: "Administrador" };

// cada consulta responde vacio salvo que el test diga otra cosa
const sinResultados = () => pool.query.mockResolvedValue([[]]);

const consultas = () => pool.query.mock.calls.map(([sql, parametros]) => ({ sql, parametros }));

describe("busqueda.service.buscar", () => {
    test.each([undefined, "", " ", "a", ["ab"]])(
        "rechaza con 400 un texto demasiado corto o invalido (%p) sin consultar la base",
        async (q) => {
            await expect(busquedaService.buscar(q, tecnico))
                .rejects.toMatchObject({ status: 400 });

            expect(pool.query).not.toHaveBeenCalled();
        }
    );

    test("rechaza con 400 un texto de mas de 80 caracteres", async () => {
        await expect(busquedaService.buscar("x".repeat(81), tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("80") });
    });

    test("el Cliente busca solo en sus tickets y equipos, nunca personas", async () => {
        sinResultados();

        const resultado = await busquedaService.buscar("dell", cliente);

        expect(pool.query).toHaveBeenCalledTimes(2);
        for (const { sql, parametros } of consultas()) {
            expect(sql).toMatch(/id_usuario = \?/);
            expect(parametros).toContain(5);
        }
        expect(resultado).toEqual({ tickets: [], equipos: [], clientes: [], personal: [] });
    });

    test("el Tecnico busca tickets, equipos y clientes pero no al personal", async () => {
        sinResultados();

        await busquedaService.buscar("dell", tecnico);

        expect(pool.query).toHaveBeenCalledTimes(3);
        const personas = consultas().filter(({ sql }) => sql.includes("FROM usuario\n"));
        expect(personas).toHaveLength(1);
        expect(personas[0].sql).toMatch(/rol = \?/);
    });

    test("el Administrador ademas busca al personal (rol distinto de Cliente)", async () => {
        sinResultados();

        await busquedaService.buscar("ana", administrador);

        expect(pool.query).toHaveBeenCalledTimes(4);
        expect(consultas().some(({ sql }) => /rol <> \?/.test(sql))).toBe(true);
    });

    test("escapa los comodines de LIKE para buscarlos literales", async () => {
        sinResultados();

        await busquedaService.buscar("50%_x", tecnico);

        expect(consultas()[0].parametros[0]).toBe("%50\\%\\_x%");
    });

    test.each([["TK-0004", 4], ["tk4", 4], ["12", 12]])(
        "%p tambien busca el ticket por su numero",
        async (q, numero) => {
            sinResultados();

            await busquedaService.buscar(q, tecnico);

            expect(consultas()[0].parametros).toContain(numero);
        }
    );

    test("devuelve los resultados agrupados", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 4 }]])
            .mockResolvedValueOnce([[{ id_equipo: 2 }]])
            .mockResolvedValueOnce([[{ id_usuario: 5 }]]);

        const resultado = await busquedaService.buscar("router", tecnico);

        expect(resultado).toEqual({
            tickets: [{ id_ticket: 4 }],
            equipos: [{ id_equipo: 2 }],
            clientes: [{ id_usuario: 5 }],
            personal: [],
        });
    });
});
