jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const ticketService = require("../../src/services/ticket.service");

const datosValidos = {
    id_usuario: 14,
    id_equipo: 1,
    titulo: "No enciende",
    descripcion: "El equipo no prende al conectarlo.",
    prioridad: "Alta",
    categoria: "Hardware"
};

describe("ticket.service.crearTicket", () => {
    test("rechaza si falta cualquier campo obligatorio", async () => {
        const { titulo, ...sinTitulo } = datosValidos;

        await expect(ticketService.crearTicket(sinTitulo))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza una categoria que no este en la lista permitida", async () => {
        await expect(ticketService.crearTicket({ ...datosValidos, categoria: "Impresoras" }))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("Categoría inválida") });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza con 404 si el equipo no pertenece al cliente indicado", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 14 }]]) // verificarClienteExiste: existe
            .mockResolvedValueOnce([[]]);                   // equipo: no encontrado para este cliente

        await expect(ticketService.crearTicket(datosValidos))
            .rejects.toMatchObject({ status: 404, message: expect.stringContaining("equipo") });
    });

    test("con datos validos: crea el ticket en estado Abierto", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 14 }]])                    // verificarClienteExiste
            .mockResolvedValueOnce([[{ id_equipo: 1 }]])                      // equipo valido
            .mockResolvedValueOnce([{ insertId: 99 }])                       // INSERT
            .mockResolvedValueOnce([[{ id_ticket: 99, estado: "Abierto" }]]); // SELECT final

        const ticket = await ticketService.crearTicket(datosValidos);

        expect(ticket.id_ticket).toBe(99);

        const argsInsert = pool.query.mock.calls[2][1];
        expect(argsInsert).toContain("Abierto");
    });
});

describe("ticket.service.cerrarTicket", () => {
    test("rechaza con 404 si el ticket no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(ticketService.cerrarTicket(999))
            .rejects.toMatchObject({ status: 404 });
    });

    test("rechaza con 409 si el ticket ya estaba Cerrado", async () => {
        pool.query.mockResolvedValueOnce([[{ id_ticket: 1, estado: "Cerrado" }]]);

        await expect(ticketService.cerrarTicket(1))
            .rejects.toMatchObject({ status: 409 });
    });

    test("cierra un ticket que no estaba cerrado", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "En proceso" }]]) // SELECT estado actual
            .mockResolvedValueOnce([{}])                                       // UPDATE
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "Cerrado" }]]);   // SELECT final

        const ticket = await ticketService.cerrarTicket(1);

        expect(ticket.estado).toBe("Cerrado");
    });
});

describe("ticket.service.cambiarEstadoTicket", () => {
    test("rechaza un estado fuera de 'En proceso' / 'Resuelto' (Abierto y Cerrado tienen su propio flujo)", async () => {
        await expect(ticketService.cambiarEstadoTicket(1, "Abierto"))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza con 409 si el ticket ya esta Cerrado — no puede volver a cambiar de estado", async () => {
        pool.query.mockResolvedValueOnce([[{ id_ticket: 1, estado: "Cerrado" }]]);

        await expect(ticketService.cambiarEstadoTicket(1, "Resuelto"))
            .rejects.toMatchObject({ status: 409 });
    });

    test("permite pasar de Abierto a En proceso", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "Abierto" }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "En proceso" }]]);

        const ticket = await ticketService.cambiarEstadoTicket(1, "En proceso");

        expect(ticket.estado).toBe("En proceso");
    });

    // Gate de "Resuelto": no se puede marcar sin una cotizacion Aprobada
    // con una factura vigente (no Anulada), salvo la excepcion explicita
    // de "sin costo" con motivo.
    test("rechaza Resuelto sin cotizacion aprobada+facturada, sin marcar sin costo", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "En proceso" }]]) // ticket existe
            .mockResolvedValueOnce([[]]);                                      // sin linea de cotizacion

        await expect(ticketService.cambiarEstadoTicket(1, "Resuelto"))
            .rejects.toMatchObject({ status: 409 });

        expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test("rechaza Resuelto sin costo si no se indica un motivo", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "En proceso" }]])
            .mockResolvedValueOnce([[]]);

        await expect(ticketService.cambiarEstadoTicket(1, "Resuelto", { sinCosto: true }))
            .rejects.toMatchObject({ status: 400 });
    });

    test("permite Resuelto sin costo cuando se indica un motivo", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "En proceso" }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "Resuelto" }]]);

        const ticket = await ticketService.cambiarEstadoTicket(1, "Resuelto", {
            sinCosto: true,
            motivoSinCosto: "Revisión sin falla encontrada, no se cobra."
        });

        expect(ticket.estado).toBe("Resuelto");
    });

    test("permite Resuelto cuando hay una cotizacion aprobada con factura vigente", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "En proceso" }]])
            .mockResolvedValueOnce([[{ id_cotizacion: 5, estado_cotizacion: "Aprobada" }]])
            .mockResolvedValueOnce([[{ estado: "Pendiente" }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "Resuelto" }]]);

        const ticket = await ticketService.cambiarEstadoTicket(1, "Resuelto");

        expect(ticket.estado).toBe("Resuelto");
    });

    test("rechaza Resuelto si la factura de la cotizacion aprobada esta Anulada", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 1, estado: "En proceso" }]])
            .mockResolvedValueOnce([[{ id_cotizacion: 5, estado_cotizacion: "Aprobada" }]])
            .mockResolvedValueOnce([[{ estado: "Anulada" }]]);

        await expect(ticketService.cambiarEstadoTicket(1, "Resuelto"))
            .rejects.toMatchObject({ status: 409 });
    });
});
