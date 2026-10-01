jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const diagnosticoService = require("../../src/services/diagnostico.service");

const tecnico = { id_usuario: 3, rol: "Tecnico" };
const ticket = (estado = "En diagnostico") => [[{ id_ticket: 10, id_usuario: 5, estado }]];

describe("diagnostico.service.registrarDiagnostico", () => {
    test("rechaza con 400 un diagnostico vacio sin consultar la base", async () => {
        await expect(diagnosticoService.registrarDiagnostico("10", { diagnostico: "  " }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("diagnostico") });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("responde 404 si el ticket no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(diagnosticoService.registrarDiagnostico("99", { diagnostico: "x" }, tecnico))
            .rejects.toMatchObject({ status: 404 });
    });

    test("no diagnostica un ticket cerrado", async () => {
        pool.query.mockResolvedValueOnce(ticket("Cerrado"));

        await expect(diagnosticoService.registrarDiagnostico("10", { diagnostico: "x" }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("cerrado") });
    });

    test("si no hay diagnostico lo inserta a nombre de quien esta en el token", async () => {
        pool.query
            .mockResolvedValueOnce(ticket())
            .mockResolvedValueOnce([[]])                             // sin diagnostico previo
            .mockResolvedValueOnce([{ insertId: 1 }])                // INSERT
            .mockResolvedValueOnce([[{ id_diagnostico: 1, id_ticket: 10 }]]);

        const resultado = await diagnosticoService.registrarDiagnostico(
            "10",
            { diagnostico: " Disco dañado ", solucion: "", id_usuario: 999 },
            tecnico
        );

        expect(pool.query.mock.calls[2][0]).toContain("INSERT INTO diagnostico");
        expect(pool.query.mock.calls[2][1]).toEqual([10, 3, "Disco dañado", null, null]);
        expect(resultado.editado).toBe(false);
    });

    test("si ya hay diagnostico lo reemplaza en vez de sumar otro", async () => {
        pool.query
            .mockResolvedValueOnce(ticket())
            .mockResolvedValueOnce([[{ id_diagnostico: 7, id_ticket: 10 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }])            // UPDATE
            .mockResolvedValueOnce([[{ id_diagnostico: 7, id_ticket: 10 }]]);

        const resultado = await diagnosticoService.registrarDiagnostico("10", { diagnostico: "Otro" }, tecnico);

        expect(pool.query.mock.calls[2][0]).toContain("UPDATE diagnostico");
        expect(pool.query.mock.calls[2][1]).toEqual([3, "Otro", null, null, 7]);
        expect(resultado.editado).toBe(true);
    });
});
