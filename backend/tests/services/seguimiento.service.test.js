jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const seguimientoService = require("../../src/services/seguimiento.service");

const tecnico = { id_usuario: 3, rol: "Tecnico" };
const ticket = (estado = "En reparacion") => [[{ id_ticket: 10, id_usuario: 5, estado }]];

describe("seguimiento.service.crearActualizacion", () => {
    test("rechaza con 400 un avance vacio sin consultar la base", async () => {
        await expect(seguimientoService.crearActualizacion("10", { observaciones: " " }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("observaciones") });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("un ticket cerrado no recibe avances", async () => {
        pool.query.mockResolvedValueOnce(ticket("Cerrado"));

        await expect(seguimientoService.crearActualizacion("10", { observaciones: "x" }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("cerrado") });
    });

    test("guarda el avance con el estado actual del ticket y el autor del token", async () => {
        pool.query
            .mockResolvedValueOnce(ticket("En reparacion"))
            .mockResolvedValueOnce([{ insertId: 4 }])
            .mockResolvedValueOnce([[{ id_actualizacion: 4 }]]);

        const actualizacion = await seguimientoService.crearActualizacion(
            "10",
            { observaciones: " Se cambio la pantalla ", id_usuario: 999 },
            tecnico
        );

        expect(pool.query.mock.calls[1][1]).toEqual([10, 3, "Avance", "En reparacion", "Se cambio la pantalla"]);
        expect(actualizacion).toEqual({ id_actualizacion: 4 });
    });
});

describe("seguimiento.service.crearNota", () => {
    test("rechaza con 400 una nota vacia", async () => {
        await expect(seguimientoService.crearNota("10", {}, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("contenido") });
    });

    test("guarda la nota privada a nombre de quien esta en el token", async () => {
        pool.query
            .mockResolvedValueOnce(ticket())
            .mockResolvedValueOnce([{ insertId: 2 }])
            .mockResolvedValueOnce([[{ id_nota: 2 }]]);

        await seguimientoService.crearNota("10", { contenido: "Pedir repuesto" }, tecnico);

        expect(pool.query.mock.calls[1][1]).toEqual([10, 3, "Pedir repuesto"]);
    });
});
