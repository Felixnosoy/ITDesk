jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const especialidadService = require("../../src/services/especialidad.service");

describe("especialidad.service.crearEspecialidad", () => {
    test("rechaza si falta el nombre", async () => {
        await expect(especialidadService.crearEspecialidad({}))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza un nombre ya existente", async () => {
        pool.query.mockResolvedValueOnce([[{ id_especialidad: 1 }]]);

        await expect(especialidadService.crearEspecialidad({ nombre: "Redes" }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("crea la especialidad con datos validos", async () => {
        pool.query
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{ insertId: 5 }])
            .mockResolvedValueOnce([[{ id_especialidad: 5, nombre: "Redes" }]]);

        const especialidad = await especialidadService.crearEspecialidad({ nombre: "Redes" });

        expect(especialidad.id_especialidad).toBe(5);
    });
});

describe("especialidad.service.actualizarEspecialidad", () => {
    test("rechaza si la especialidad no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(especialidadService.actualizarEspecialidad(99, { nombre: "Redes" }))
            .rejects.toMatchObject({ status: 404 });
    });

    test("actualiza el nombre con datos validos", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_especialidad: 1, nombre: "Redes" }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_especialidad: 1, nombre: "Redes Avanzadas" }]]);

        const especialidad = await especialidadService.actualizarEspecialidad(1, { nombre: "Redes Avanzadas" });

        expect(especialidad.nombre).toBe("Redes Avanzadas");
    });
});

describe("especialidad.service.eliminarEspecialidad", () => {
    test("rechaza con 409 si hay tecnicos con esa especialidad asignada", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_especialidad: 1 }]])
            .mockResolvedValueOnce([[{ id_tecnico_especialidad: 9 }]]);

        await expect(especialidadService.eliminarEspecialidad(1))
            .rejects.toMatchObject({ status: 409 });
    });

    test("elimina si ningun tecnico la tiene asignada", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_especialidad: 1 }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{}]);

        await especialidadService.eliminarEspecialidad(1);

        expect(pool.query).toHaveBeenCalledTimes(3);
    });
});

describe("especialidad.service.obtenerEspecialidadesDeTecnico", () => {
    test("rechaza si el usuario no es un tecnico existente", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(especialidadService.obtenerEspecialidadesDeTecnico(1))
            .rejects.toMatchObject({ status: 404 });
    });

    test("devuelve las especialidades del tecnico", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 4 }]])
            .mockResolvedValueOnce([[{ id_especialidad: 1, nombre: "Redes" }]]);

        const especialidades = await especialidadService.obtenerEspecialidadesDeTecnico(4);

        expect(especialidades).toHaveLength(1);
    });
});

describe("especialidad.service.asignarEspecialidadesTecnico", () => {
    test("rechaza si especialidades no es un arreglo", async () => {
        pool.query.mockResolvedValueOnce([[{ id_usuario: 4 }]]);

        await expect(especialidadService.asignarEspecialidadesTecnico(4, "Redes"))
            .rejects.toMatchObject({ status: 400 });
    });

    test("rechaza si alguna especialidad indicada no existe", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 4 }]])
            .mockResolvedValueOnce([[{ id_especialidad: 1 }]]);

        await expect(especialidadService.asignarEspecialidadesTecnico(4, [1, 999]))
            .rejects.toMatchObject({ status: 400 });
    });

    test("reemplaza el set completo con ids validos", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 4 }]])
            .mockResolvedValueOnce([[{ id_especialidad: 1 }, { id_especialidad: 2 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_usuario: 4 }]])
            .mockResolvedValueOnce([[{ id_especialidad: 1, nombre: "Redes" }, { id_especialidad: 2, nombre: "Hardware" }]]);

        const especialidades = await especialidadService.asignarEspecialidadesTecnico(4, [1, 2]);

        expect(especialidades).toHaveLength(2);
    });

    test("permite vaciar el set de especialidades con un arreglo vacio", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 4 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_usuario: 4 }]])
            .mockResolvedValueOnce([[]]);

        const especialidades = await especialidadService.asignarEspecialidadesTecnico(4, []);

        expect(especialidades).toEqual([]);
    });
});
