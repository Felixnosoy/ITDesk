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

        // sin ficha: especificaciones en null, sin garantia
        expect(pool.query.mock.calls[2][1]).toEqual([
            5, "Laptop", "Dell", "Latitude", "SERIE-1", null,
            null, null, null, null, null, 0, null, null
        ]);
        expect(equipo).toEqual({ id_equipo: 9 });
    });

    test("guarda especificaciones, garantia y codigo de activo", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 5, estado: "Activo" }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 9 }])
            .mockResolvedValueOnce([[{ id_equipo: 9 }]]);

        await equipoService.crearEquipo({
            ...datos,
            sistema_operativo: " Windows 11 ",
            procesador: "Intel i5",
            memoria_ram: "16 GB",
            almacenamiento: "512 GB SSD",
            color: "Negro",
            en_garantia: true,
            garantia_vence: "2027-03-31",
            codigo_activo: "ACT-0042"
        });

        expect(pool.query.mock.calls[2][1].slice(6)).toEqual([
            "Windows 11", "Intel i5", "16 GB", "512 GB SSD", "Negro", 1, "2027-03-31", "ACT-0042"
        ]);
    });

    test("sin garantia descarta la fecha de vencimiento", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 5, estado: "Activo" }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 9 }])
            .mockResolvedValueOnce([[{ id_equipo: 9 }]]);

        await equipoService.crearEquipo({ ...datos, en_garantia: false, garantia_vence: "2027-03-31" });

        expect(pool.query.mock.calls[2][1].slice(11, 13)).toEqual([0, null]);
    });

    test.each([
        ["garantia_vence", "31/03/2027"],
        ["garantia_vence", "2027-02-30"],
        ["en_garantia", "quizas"],
        ["procesador", "x".repeat(81)]
    ])("rechaza con 400 un %s invalido (%p) sin consultar la base", async (campo, valor) => {
        await expect(equipoService.crearEquipo({ ...datos, en_garantia: true, [campo]: valor }))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining(campo) });

        expect(pool.query).not.toHaveBeenCalled();
    });
});

describe("equipo.service.obtenerEquipoPorId", () => {
    const tecnico = { id_usuario: 3, rol: "Tecnico" };

    test("rechaza con 400 un id invalido sin consultar la base", async () => {
        await expect(equipoService.obtenerEquipoPorId("x", tecnico)).rejects.toMatchObject({ status: 400 });
        expect(pool.query).not.toHaveBeenCalled();
    });

    test("responde 404 si no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);
        await expect(equipoService.obtenerEquipoPorId("9", tecnico)).rejects.toMatchObject({ status: 404 });
    });

    test("el personal ve cualquier equipo, con el nombre del cliente", async () => {
        pool.query.mockResolvedValueOnce([[{ id_equipo: 9, id_usuario: 5, cliente: "Maria Gomez" }]]);

        const equipo = await equipoService.obtenerEquipoPorId("9", tecnico);

        expect(pool.query.mock.calls[0][1]).toEqual([9]);
        expect(equipo.cliente).toBe("Maria Gomez");
    });

    test("al Cliente un equipo ajeno le responde 404, como si no existiera", async () => {
        pool.query.mockResolvedValueOnce([[{ id_equipo: 9, id_usuario: 5 }]]);

        await expect(equipoService.obtenerEquipoPorId("9", { id_usuario: 7, rol: "Cliente" }))
            .rejects.toMatchObject({ status: 404 });
    });

    test("el Cliente ve su propio equipo", async () => {
        pool.query.mockResolvedValueOnce([[{ id_equipo: 9, id_usuario: 7 }]]);

        await expect(equipoService.obtenerEquipoPorId("9", { id_usuario: 7, rol: "Cliente" }))
            .resolves.toMatchObject({ id_equipo: 9 });
    });
});
