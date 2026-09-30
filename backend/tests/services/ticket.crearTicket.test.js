jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const ticketService = require("../../src/services/ticket.service");

const datos = {
    id_cliente: 5,
    id_equipo: 2,
    id_tecnico: 3,
    titulo: " No enciende ",
    descripcion: "No da imagen.",
    prioridad: "Alta",
    categoria: "Hardware"
};

// respuestas de las 3 verificaciones contra la base, en orden
const referenciasValidas = () => pool.query
    .mockResolvedValueOnce([[{ estado: "Activo" }]])  // cliente
    .mockResolvedValueOnce([[{ id_equipo: 2 }]])      // equipo del cliente
    .mockResolvedValueOnce([[{ id_usuario: 3 }]]);    // tecnico activo

describe("ticket.service.crearTicket (validaciones)", () => {
    test.each([
        ["id_tecnico", undefined],
        ["id_tecnico", "abc"],
        ["id_cliente", 0],
        ["id_equipo", "2.5"],
        ["titulo", "  "],
        ["titulo", "x".repeat(151)],
        ["descripcion", undefined],
        ["prioridad", "Urgente"],
        ["categoria", "hardware"]
    ])("rechaza con 400 un %s invalido (%p) sin consultar la base", async (campo, valor) => {
        await expect(ticketService.crearTicket({ ...datos, [campo]: valor }, 9))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining(campo) });

        expect(pool.query).not.toHaveBeenCalled();
        expect(pool.getConnection).not.toHaveBeenCalled();
    });

    test("responde 404 si el cliente no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(ticketService.crearTicket(datos, 9)).rejects.toMatchObject({ status: 404 });
    });

    test("rechaza con 400 un cliente inactivo", async () => {
        pool.query.mockResolvedValueOnce([[{ estado: "Inactivo" }]]);

        await expect(ticketService.crearTicket(datos, 9))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("inactivo") });
    });

    test("rechaza con 400 un equipo que no es del cliente", async () => {
        pool.query
            .mockResolvedValueOnce([[{ estado: "Activo" }]])
            .mockResolvedValueOnce([[]]);

        await expect(ticketService.crearTicket(datos, 9))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("equipo") });

        expect(pool.query.mock.calls[1][1]).toEqual([2, 5]);
    });

    test("rechaza con 400 un tecnico inexistente, inactivo o de otro rol", async () => {
        pool.query
            .mockResolvedValueOnce([[{ estado: "Activo" }]])
            .mockResolvedValueOnce([[{ id_equipo: 2 }]])
            .mockResolvedValueOnce([[]]);

        await expect(ticketService.crearTicket(datos, 9))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("técnico") });

        expect(pool.query.mock.calls[2][1]).toEqual([3, "Tecnico", "Activo"]);
        expect(pool.getConnection).not.toHaveBeenCalled();
    });
});

describe("ticket.service.crearTicket (transaccion)", () => {
    test("guarda ticket Abierto y asignacion en una transaccion confirmada", async () => {
        referenciasValidas()
            .mockResolvedValueOnce([{ insertId: 40 }])        // INSERT ticket
            .mockResolvedValueOnce([{ insertId: 1 }])         // INSERT asignacion
            .mockResolvedValueOnce([[{ id_ticket: 40 }]]);    // SELECT final

        const ticket = await ticketService.crearTicket(datos, 9);

        const insertTicket = pool.query.mock.calls[3][1];
        expect(insertTicket).toEqual([5, 2, "No enciende", "No da imagen.", "Alta", "Hardware", "Abierto"]);
        expect(pool.query.mock.calls[4][1]).toEqual([40, 3, 9]); // ticket, tecnico, asignado por
        expect(pool.conexion.beginTransaction).toHaveBeenCalled();
        expect(pool.conexion.commit).toHaveBeenCalled();
        expect(pool.conexion.rollback).not.toHaveBeenCalled();
        expect(pool.conexion.release).toHaveBeenCalled();
        expect(ticket).toEqual({ id_ticket: 40 });
    });

    test("si falla la asignacion deshace el ticket y libera la conexion", async () => {
        referenciasValidas()
            .mockResolvedValueOnce([{ insertId: 40 }])
            .mockRejectedValueOnce(new Error("fallo al asignar"));

        await expect(ticketService.crearTicket(datos, 9)).rejects.toThrow("fallo al asignar");

        expect(pool.conexion.rollback).toHaveBeenCalled();
        expect(pool.conexion.commit).not.toHaveBeenCalled();
        expect(pool.conexion.release).toHaveBeenCalled();
    });
});
