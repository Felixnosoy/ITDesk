jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const ticketService = require("../../src/services/ticket.service");

describe("ticket.service.obtenerTickets (alcance segun el rol)", () => {
    test("el Cliente solo consulta sus propios tickets, con su id del token", async () => {
        pool.query.mockResolvedValueOnce([[{ id_ticket: 1 }]]);

        const tickets = await ticketService.obtenerTickets({ id_usuario: 7, rol: "Cliente" });

        const [sql, parametros] = pool.query.mock.calls[0];
        expect(sql).toContain("t.id_usuario = ?");
        expect(parametros).toEqual([7]);
        expect(tickets).toEqual([{ id_ticket: 1 }]);
    });

    test.each(["Tecnico", "Administrador", "Recepcionista"])(
        "%s consulta todos los tickets, sin filtrar por cliente",
        async (rol) => {
            pool.query.mockResolvedValueOnce([[]]);

            await ticketService.obtenerTickets({ id_usuario: 3, rol });

            const [sql, parametros] = pool.query.mock.calls[0];
            expect(sql).not.toContain("WHERE");
            expect(parametros).toEqual([]);
        }
    );

    test("trae el tecnico de la asignacion activa sin excluir tickets sin tecnico", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await ticketService.obtenerTickets({ id_usuario: 3, rol: "Tecnico" });

        const [sql] = pool.query.mock.calls[0];
        expect(sql).toMatch(/LEFT JOIN asignacion a\s+ON a.id_ticket = t.id_ticket\s+AND a.activa = 1/);
    });
});
