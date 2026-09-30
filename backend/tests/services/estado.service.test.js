jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const estadoService = require("../../src/services/estado.service");
const ESTADOS_TICKET = require("../../src/constants/estadosTicket");

const tecnico = { id_usuario: 3, rol: "Tecnico" };
const ticketEn = (estado) => [[{ id_ticket: 10, id_usuario: 5, estado }]];

describe("estado.service.TRANSICIONES", () => {
    test("cubre los 6 estados y solo apunta a estados que existen", () => {
        const estados = Object.values(ESTADOS_TICKET);

        expect(Object.keys(estadoService.TRANSICIONES).sort()).toEqual([...estados].sort());
        for (const destinos of Object.values(estadoService.TRANSICIONES)) {
            destinos.forEach((destino) => expect(estados).toContain(destino));
        }
    });

    test("Cerrado es final y Abierto solo pasa a En diagnostico", () => {
        expect(estadoService.estadosSiguientes("Cerrado")).toEqual([]);
        expect(estadoService.estadosSiguientes("Abierto")).toEqual(["En diagnostico"]);
    });
});

describe("estado.service.cambiarEstado", () => {
    test.each([
        ["un estado fuera del catalogo", "Abierto", "Pausado", "debe ser uno de"],
        ["el mismo estado", "En reparacion", "En reparacion", "ya está en"],
        ["saltarse el diagnostico", "Abierto", "En reparacion", "Desde Abierto se puede pasar a: En diagnostico"],
        ["mover un ticket cerrado", "Cerrado", "Abierto", "cerrado"]
    ])("rechaza con 400 %s sin tocar el ticket", async (caso, actual, nuevo, mensaje) => {
        pool.query.mockResolvedValueOnce(ticketEn(actual));

        await expect(estadoService.cambiarEstado("10", { estado: nuevo }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining(mensaje) });

        expect(pool.getConnection).not.toHaveBeenCalled();
    });

    test("no pasa a Esperando aprobacion sin diagnostico", async () => {
        pool.query
            .mockResolvedValueOnce(ticketEn("En diagnostico"))
            .mockResolvedValueOnce([[]]); // sin diagnostico

        await expect(estadoService.cambiarEstado("10", { estado: "Esperando aprobacion" }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("diagnóstico") });
    });

    test("un cambio valido actualiza el ticket y lo anota en la linea de tiempo", async () => {
        pool.query
            .mockResolvedValueOnce(ticketEn("Abierto"))
            .mockResolvedValueOnce([{ affectedRows: 1 }])   // UPDATE ticket
            .mockResolvedValueOnce([{ insertId: 1 }])       // INSERT actualizacion
            .mockResolvedValueOnce(ticketEn("En diagnostico"));

        const { anterior, ticket } = await estadoService.cambiarEstado(
            "10",
            { estado: "En diagnostico", observaciones: " Se recibe el equipo " },
            tecnico
        );

        expect(pool.query.mock.calls[1][1]).toEqual(["En diagnostico", 10]);
        expect(pool.query.mock.calls[2][1]).toEqual([10, 3, "Estado", "En diagnostico", "Se recibe el equipo"]);
        expect(pool.conexion.commit).toHaveBeenCalled();
        expect(anterior).toBe("Abierto");
        expect(ticket.estado).toBe("En diagnostico");
    });

    test("si falla la linea de tiempo se deshace el cambio de estado", async () => {
        pool.query
            .mockResolvedValueOnce(ticketEn("Abierto"))
            .mockResolvedValueOnce([{ affectedRows: 1 }])
            .mockRejectedValueOnce(new Error("fallo"));

        await expect(estadoService.cambiarEstado("10", { estado: "En diagnostico" }, tecnico)).rejects.toThrow("fallo");

        expect(pool.conexion.rollback).toHaveBeenCalled();
        expect(pool.conexion.release).toHaveBeenCalled();
    });

    test.each([
        ["Resuelto", "En reparacion", "fecha_resolucion = NOW()"],
        ["Cerrado", "Resuelto", "fecha_cierre = NOW()"],
        ["En reparacion", "Resuelto", "fecha_resolucion = NULL"]
    ])("al pasar a %s ajusta la fecha (%s -> %s)", async (nuevo, actual, fecha) => {
        pool.query
            .mockResolvedValueOnce(ticketEn(actual))
            .mockResolvedValueOnce([{ affectedRows: 1 }])
            .mockResolvedValueOnce([{ insertId: 1 }])
            .mockResolvedValueOnce(ticketEn(nuevo));

        await estadoService.cambiarEstado("10", { estado: nuevo, sin_costo: true }, tecnico);

        expect(pool.query.mock.calls[1][0]).toContain(fecha);
    });
});
