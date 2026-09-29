jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const usuarioService = require("../../src/services/usuario.service");

describe("usuario.service.buscarClientes", () => {
    test.each([undefined, "", " ", "a", ["ana", "luis"]])(
        "rechaza con 400 una busqueda vacia o muy corta (%p) sin consultar la base",
        async (busqueda) => {
            await expect(usuarioService.buscarClientes(busqueda))
                .rejects.toMatchObject({ status: 400 });

            expect(pool.query).not.toHaveBeenCalled();
        }
    );

    test("busca solo clientes activos, con el texto recortado en los 5 campos", async () => {
        pool.query.mockResolvedValueOnce([[{ id_usuario: 4 }]]);

        const clientes = await usuarioService.buscarClientes("  gomez ");

        const [sql, parametros] = pool.query.mock.calls[0];
        expect(parametros.slice(0, 2)).toEqual(["Cliente", "Activo"]);
        expect(parametros.slice(2, 7)).toEqual(Array(5).fill("%gomez%"));
        expect(sql).toContain("LIMIT ?");
        expect(sql).not.toContain("contraseña");
        expect(clientes).toEqual([{ id_usuario: 4 }]);
    });

    test("los comodines de LIKE del texto se buscan literales", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await usuarioService.buscarClientes("001_2%");

        const [, parametros] = pool.query.mock.calls[0];
        expect(parametros[2]).toBe("%001\\_2\\%%");
    });
});
