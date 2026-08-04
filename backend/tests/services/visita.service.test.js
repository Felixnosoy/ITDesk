jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const visitaService = require("../../src/services/visita.service");
const ROLES = require("../../src/constants/roles");

const datosValidos = {
    id_usuario: 12,
    id_especialidad: 1,
    fecha_solicitada: "2099-01-01",
    hora_solicitada: "10:00",
    direccion: "Calle Principal 123",
    motivo: "El equipo no enciende"
};

describe("visita.service.crearVisita", () => {
    test("rechaza si falta cualquier campo obligatorio", async () => {
        const { motivo, ...sinMotivo } = datosValidos;

        await expect(visitaService.crearVisita(sinMotivo))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza una fecha/hora en el pasado", async () => {
        await expect(visitaService.crearVisita({ ...datosValidos, fecha_solicitada: "2020-01-01" }))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza si la especialidad no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(visitaService.crearVisita(datosValidos))
            .rejects.toMatchObject({ status: 404 });
    });

    test("crea la visita con datos validos", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_especialidad: 1, nombre: "Redes" }]])
            .mockResolvedValueOnce([{ insertId: 10 }])
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente" }]]);

        const visita = await visitaService.crearVisita(datosValidos);

        expect(visita.id_visita).toBe(10);
        expect(visita.estado).toBe("Pendiente");
    });
});

describe("visita.service.obtenerDisponibilidad", () => {
    test("rechaza si faltan parametros", async () => {
        await expect(visitaService.obtenerDisponibilidad(null, "2099-01-01"))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza si la especialidad no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(visitaService.obtenerDisponibilidad(99, "2099-01-01"))
            .rejects.toMatchObject({ status: 404 });
    });

    test("devuelve tecnicos con sus horas ya ocupadas ese dia", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_especialidad: 1, nombre: "Redes" }]])
            .mockResolvedValueOnce([[{ id_usuario: 4, nombre: "Ana Pérez" }]])
            .mockResolvedValueOnce([[{ id_tecnico: 4, hora_solicitada: "10:00:00" }]]);

        const disponibilidad = await visitaService.obtenerDisponibilidad(1, "2099-01-01");

        expect(disponibilidad).toEqual([
            { id_usuario: 4, nombre: "Ana Pérez", horasOcupadas: ["10:00:00"] }
        ]);
    });
});

describe("visita.service.confirmarVisita", () => {
    test("rechaza si la visita no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(visitaService.confirmarVisita(999, { id_tecnico: 4, id_equipo: 7 }))
            .rejects.toMatchObject({ status: 404 });
    });

    test("rechaza si la visita ya esta en un estado terminal", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "Cancelada" }]]);

        await expect(visitaService.confirmarVisita(10, { id_tecnico: 4 }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("rechaza si no se indica tecnico y la visita tampoco tiene uno ya asignado", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente", id_tecnico: null }]]);

        await expect(visitaService.confirmarVisita(10, {}))
            .rejects.toMatchObject({ status: 400 });
    });

    test("rechaza si no hay ticket previo y no se indica equipo ni ticket existente", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente", id_tecnico: null, id_ticket: null }]])
            .mockResolvedValueOnce([[{ id_usuario: 4 }]]); // verificarTecnicoExiste

        await expect(visitaService.confirmarVisita(10, { id_tecnico: 4 }))
            .rejects.toMatchObject({ status: 400 });
    });

    test("confirma vinculando un ticket existente del mismo cliente", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente", id_usuario: 12, id_tecnico: null, id_ticket: null }]]) // obtenerVisitaCruda
            .mockResolvedValueOnce([[{ id_usuario: 4 }]]) // verificarTecnicoExiste
            .mockResolvedValueOnce([[{ id_ticket: 55, id_usuario: 12 }]]) // ticketService.obtenerTicketPorId
            .mockResolvedValueOnce([{}]) // UPDATE visita_tecnica
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Confirmada", id_ticket: 55 }]]); // obtenerVisitaPorId final

        const visita = await visitaService.confirmarVisita(10, { id_tecnico: 4, id_ticket: 55 });

        expect(visita.estado).toBe("Confirmada");
        expect(visita.id_ticket).toBe(55);
    });

    test("rechaza vincular un ticket que pertenece a otro cliente", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente", id_usuario: 12, id_tecnico: null, id_ticket: null }]])
            .mockResolvedValueOnce([[{ id_usuario: 4 }]])
            .mockResolvedValueOnce([[{ id_ticket: 55, id_usuario: 999 }]]); // ticket de otro cliente

        await expect(visitaService.confirmarVisita(10, { id_tecnico: 4, id_ticket: 55 }))
            .rejects.toMatchObject({ status: 400 });
    });

    test("confirma creando un ticket nuevo con el equipo indicado", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente", id_usuario: 12, id_especialidad: 1, id_tecnico: null, id_ticket: null, motivo: "No enciende" }]]) // obtenerVisitaCruda
            .mockResolvedValueOnce([[{ id_usuario: 4 }]]) // verificarTecnicoExiste
            .mockResolvedValueOnce([[{ id_especialidad: 1, nombre: "Redes" }]]) // especialidadService.obtenerEspecialidadPorId
            .mockResolvedValueOnce([[{ id_usuario: 12 }]]) // ticketService: verificarClienteExiste
            .mockResolvedValueOnce([[{ id_equipo: 7 }]]) // ticketService: equipo valido
            .mockResolvedValueOnce([{ insertId: 60 }]) // ticketService: INSERT
            .mockResolvedValueOnce([[{ id_ticket: 60, estado: "Abierto" }]]) // ticketService: SELECT final
            .mockResolvedValueOnce([{}]) // UPDATE visita_tecnica
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Confirmada", id_ticket: 60 }]]); // obtenerVisitaPorId final

        const visita = await visitaService.confirmarVisita(10, { id_tecnico: 4, id_equipo: 7 });

        expect(visita.estado).toBe("Confirmada");
        expect(visita.id_ticket).toBe(60);
    });
});

describe("visita.service.reprogramarVisita", () => {
    test("rechaza si falta fecha u hora", async () => {
        await expect(visitaService.reprogramarVisita(10, {}))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza una fecha en el pasado", async () => {
        await expect(visitaService.reprogramarVisita(10, { fecha_solicitada: "2020-01-01", hora_solicitada: "10:00" }))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza si la visita ya esta en un estado terminal", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "Finalizada" }]]);

        await expect(visitaService.reprogramarVisita(10, { fecha_solicitada: "2099-01-01", hora_solicitada: "10:00" }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("reprograma la visita con datos validos", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente" }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Reprogramada" }]]);

        const visita = await visitaService.reprogramarVisita(10, { fecha_solicitada: "2099-01-01", hora_solicitada: "10:00" });

        expect(visita.estado).toBe("Reprogramada");
    });
});

describe("visita.service.asignarTecnico", () => {
    test("rechaza si falta el id del tecnico", async () => {
        await expect(visitaService.asignarTecnico(10, {}))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza si el tecnico no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(visitaService.asignarTecnico(10, { id_tecnico: 999 }))
            .rejects.toMatchObject({ status: 404 });
    });

    test("reasigna el tecnico con datos validos", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 4 }]]) // verificarTecnicoExiste
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Confirmada" }]]) // obtenerVisitaCruda
            .mockResolvedValueOnce([{}]) // UPDATE
            .mockResolvedValueOnce([[{ id_visita: 10, tecnico: "Ana Pérez" }]]); // obtenerVisitaPorId final

        const visita = await visitaService.asignarTecnico(10, { id_tecnico: 4 });

        expect(visita.tecnico).toBe("Ana Pérez");
    });
});

describe("visita.service.cancelarVisita", () => {
    test("rechaza si la visita ya esta en un estado terminal", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "Cancelada" }]]);

        await expect(visitaService.cancelarVisita(10, { id_usuario: 1, rol: ROLES.ADMINISTRADOR }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("rechaza si un cliente intenta cancelar la visita de otro cliente", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente", id_usuario: 12 }]]);

        await expect(visitaService.cancelarVisita(10, { id_usuario: 999, rol: ROLES.CLIENTE }))
            .rejects.toMatchObject({ status: 403 });
    });

    test("rechaza si el cliente intenta cancelar una visita que ya esta En camino", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "En camino", id_usuario: 12 }]]);

        await expect(visitaService.cancelarVisita(10, { id_usuario: 12, rol: ROLES.CLIENTE }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("el staff puede cancelar en cualquier estado no terminal", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "En progreso", id_usuario: 12 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Cancelada" }]]);

        const visita = await visitaService.cancelarVisita(10, { id_usuario: 1, rol: ROLES.ADMINISTRADOR });

        expect(visita.estado).toBe("Cancelada");
    });

    test("el cliente puede cancelar su propia visita mientras siga Pendiente", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Pendiente", id_usuario: 12 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Cancelada" }]]);

        const visita = await visitaService.cancelarVisita(10, { id_usuario: 12, rol: ROLES.CLIENTE });

        expect(visita.estado).toBe("Cancelada");
    });
});

describe("visita.service.cambiarEstadoPropia", () => {
    test("rechaza un estado fuera de los permitidos para el tecnico", async () => {
        await expect(visitaService.cambiarEstadoPropia(10, "Pendiente", { id_usuario: 4, rol: ROLES.TECNICO }))
            .rejects.toMatchObject({ status: 400 });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza si la visita ya esta en un estado terminal", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "Cancelada" }]]);

        await expect(visitaService.cambiarEstadoPropia(10, "En camino", { id_usuario: 4, rol: ROLES.TECNICO }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("rechaza si el tecnico no es el dueño de la visita", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "Confirmada", id_tecnico: 4 }]]);

        await expect(visitaService.cambiarEstadoPropia(10, "En camino", { id_usuario: 999, rol: ROLES.TECNICO }))
            .rejects.toMatchObject({ status: 403 });
    });

    test("permite pasar a En camino sin exigir diagnostico", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Confirmada", id_tecnico: 4, id_ticket: 60 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "En camino" }]]);

        const visita = await visitaService.cambiarEstadoPropia(10, "En camino", { id_usuario: 4, rol: ROLES.TECNICO });

        expect(visita.estado).toBe("En camino");
    });

    test("rechaza Finalizada si la visita todavia no tiene un ticket vinculado", async () => {
        pool.query.mockResolvedValueOnce([[{ id_visita: 10, estado: "En progreso", id_tecnico: 4, id_ticket: null }]]);

        await expect(visitaService.cambiarEstadoPropia(10, "Finalizada", { id_usuario: 4, rol: ROLES.TECNICO }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("rechaza Finalizada si el ticket vinculado no tiene diagnostico registrado", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "En progreso", id_tecnico: 4, id_ticket: 60 }]])
            .mockResolvedValueOnce([[]]); // sin diagnostico

        await expect(visitaService.cambiarEstadoPropia(10, "Finalizada", { id_usuario: 4, rol: ROLES.TECNICO }))
            .rejects.toMatchObject({ status: 409 });
    });

    test("permite Finalizada cuando el ticket ya tiene diagnostico", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "En progreso", id_tecnico: 4, id_ticket: 60 }]])
            .mockResolvedValueOnce([[{ id_diagnostico: 3 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id_visita: 10, estado: "Finalizada" }]]);

        const visita = await visitaService.cambiarEstadoPropia(10, "Finalizada", { id_usuario: 4, rol: ROLES.TECNICO });

        expect(visita.estado).toBe("Finalizada");
    });
});
