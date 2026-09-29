jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const equipoService = require("../../src/services/equipo.service");

const datos = {
    id_cliente: 5,
    tipo: " Laptop ",
    marca: "Dell",
    modelo: "Latitude",
    numero_serie: "SERIE-1"
};

describe("equipo.service.obtenerEquiposDeCliente", () => {
    test.each([undefined, "", "abc", "1.5", "-3", "0", ["5", "6"]])(
        "rechaza con 400 un id_cliente invalido (%p) sin consultar la base",
        async (id) => {
            await expect(equipoService.obtenerEquiposDeCliente(id))
                .rejects.toMatchObject({ status: 400, message: expect.stringContaining("id_cliente") });

            expect(pool.query).not.toHaveBeenCalled();
        }
    );

    test("responde 404 si el id no es de un cliente", async () => {
        pool.query.mockResolvedValueOnce([[]]); // no hay Cliente con ese id

        await expect(equipoService.obtenerEquiposDeCliente("8"))
            .rejects.toMatchObject({ status: 404 });

        expect(pool.query.mock.calls[0][1]).toEqual([8, "Cliente"]);
    });

    test("devuelve los equipos del cliente pedido", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 5, estado: "Activo" }]])
            .mockResolvedValueOnce([[{ id_equipo: 1 }, { id_equipo: 2 }]]);

        const equipos = await equipoService.obtenerEquiposDeCliente("5");

        expect(pool.query.mock.calls[1][1]).toEqual([5]);
        expect(equipos).toHaveLength(2);
    });
});

describe("equipo.service.crearEquipo", () => {
    test.each(["tipo", "marca", "modelo", "numero_serie"])(
        "rechaza con 400 si falta %s",
        async (campo) => {
            await expect(equipoService.crearEquipo({ ...datos, [campo]: "  " }))
                .rejects.toMatchObject({ status: 400, message: expect.stringContaining(campo) });

            expect(pool.query).not.toHaveBeenCalled();
        }
    );

    test("rechaza con 400 un texto mas largo que la columna", async () => {
        await expect(equipoService.crearEquipo({ ...datos, marca: "x".repeat(51) }))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("50") });
    });

    test("rechaza con 400 si el cliente esta inactivo", async () => {
        pool.query.mockResolvedValueOnce([[{ id_usuario: 5, estado: "Inactivo" }]]);

        await expect(equipoService.crearEquipo(datos))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("inactivo") });
    });

    test("rechaza con 409 un numero de serie repetido", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 5, estado: "Activo" }]])
            .mockResolvedValueOnce([[{ id_equipo: 3 }]]); // serie ocupada

        await expect(equipoService.crearEquipo(datos))
            .rejects.toMatchObject({ status: 409 });
    });

    test("convierte en 409 el UNIQUE de la tabla si dos registros chocan a la vez", async () => {
        const duplicado = Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY" });
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 5, estado: "Activo" }]])
            .mockResolvedValueOnce([[]])
            .mockRejectedValueOnce(duplicado);

        await expect(equipoService.crearEquipo(datos))
            .rejects.toMatchObject({ status: 409 });
    });

    test("con datos validos guarda los textos recortados y devuelve el equipo", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 5, estado: "Activo" }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 9 }])
            .mockResolvedValueOnce([[{ id_equipo: 9 }]]);

        const equipo = await equipoService.crearEquipo(datos);

        expect(pool.query.mock.calls[2][1]).toEqual([5, "Laptop", "Dell", "Latitude", "SERIE-1", null]);
        expect(equipo).toEqual({ id_equipo: 9 });
    });
});
