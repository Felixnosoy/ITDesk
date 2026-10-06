jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const detalleService = require("../../src/services/detalle.service");

// respuestas en el orden en que obtenerDetalle consulta la base; los
// adjuntos solo se consultan si hay novedades o notas a las que pegarlos
const respuestas = ({ estado = "En reparacion", diagnostico = [], cotizaciones = [], actualizaciones = [], notas = [], adjuntosAct = [], adjuntosNota = [] } = {}) => {
    pool.query
        .mockResolvedValueOnce([[{ id_ticket: 10, id_usuario: 5, estado }]])
        .mockResolvedValueOnce([diagnostico])
        .mockResolvedValueOnce([cotizaciones])
        .mockResolvedValueOnce([[]])                       // factura
        .mockResolvedValueOnce([actualizaciones])
        .mockResolvedValueOnce([notas]);

    // las lineas solo se buscan si hay cotizaciones
    if (cotizaciones.length > 0) pool.query.mockResolvedValueOnce([[]]);

    if (actualizaciones.length > 0) pool.query.mockResolvedValueOnce([adjuntosAct]);
    if (notas.length > 0) pool.query.mockResolvedValueOnce([adjuntosNota]);
};

describe("detalle.service.obtenerDetalle", () => {
    const tecnico = { id_usuario: 3, rol: "Tecnico" };

    test("sin diagnostico el ticket no es cotizable", async () => {
        respuestas();

        const detalle = await detalleService.obtenerDetalle("10", tecnico);

        expect(detalle.diagnostico).toBeNull();
        expect(detalle.cotizable).toBe(false);
    });

    test("pega a cada novedad y nota sus propios adjuntos", async () => {
        respuestas({
            diagnostico: [{ id_diagnostico: 1 }],
            actualizaciones: [{ id_actualizacion: 1 }, { id_actualizacion: 2 }],
            notas: [{ id_nota: 7 }],
            adjuntosAct: [{ id_archivo: 50, id_padre: 2 }],
            adjuntosNota: [{ id_archivo: 51, id_padre: 7 }]
        });

        const detalle = await detalleService.obtenerDetalle("10", tecnico);

        expect(detalle.cotizable).toBe(true);
        expect(detalle.actualizaciones[0].adjuntos).toEqual([]);
        expect(detalle.actualizaciones[1].adjuntos).toEqual([{ id_archivo: 50, url: "/api/archivos/50" }]);
        expect(detalle.notas_privadas[0].adjuntos).toEqual([{ id_archivo: 51, url: "/api/archivos/51" }]);
    });

    test.each([
        ["una cotizacion pendiente", "En reparacion", [{ id_cotizacion: 1, estado: "Pendiente" }]],
        ["una cotizacion aprobada", "En reparacion", [{ id_cotizacion: 1, estado: "Aprobada" }]],
        ["el ticket resuelto", "Resuelto", []]
    ])("con %s ya no es cotizable", async (_caso, estado, cotizaciones) => {
        respuestas({ estado, diagnostico: [{ id_diagnostico: 1 }], cotizaciones });

        const detalle = await detalleService.obtenerDetalle("10", tecnico);

        expect(detalle.cotizable).toBe(false);
        expect(detalle.cotizaciones).toHaveLength(cotizaciones.length);
    });

    test("tras un rechazo se puede volver a cotizar", async () => {
        respuestas({ diagnostico: [{ id_diagnostico: 1 }], cotizaciones: [{ id_cotizacion: 1, estado: "Rechazada" }] });

        const detalle = await detalleService.obtenerDetalle("10", tecnico);

        expect(detalle.cotizable).toBe(true);
    });
});

describe("detalle.service.obtenerDetalle (visibilidad del Cliente)", () => {
    const cliente = { id_usuario: 5, rol: "Cliente" };

    test("el Cliente dueño recibe el detalle sin la clave notas_privadas", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_ticket: 10, id_usuario: 5, estado: "Abierto" }]])
            .mockResolvedValueOnce([[]])                          // diagnostico
            .mockResolvedValueOnce([[]])                          // cotizaciones
            .mockResolvedValueOnce([[]])                          // factura
            .mockResolvedValueOnce([[{ id_actualizacion: 1 }]])   // actualizaciones
            .mockResolvedValueOnce([[]]);                         // adjuntos publicos

        const detalle = await detalleService.obtenerDetalle("10", cliente);

        expect(detalle).not.toHaveProperty("notas_privadas");
        expect(detalle.actualizaciones).toHaveLength(1);
        // nunca se consulta la tabla de notas ni los adjuntos privados
        const consultas = pool.query.mock.calls.map(([sql]) => sql).join(" ");
        expect(consultas).not.toContain("nota_privada");
        expect(consultas).not.toContain("id_nota");
    });

    test("un ticket ajeno responde 404 sin consultar nada mas", async () => {
        pool.query.mockResolvedValueOnce([[{ id_ticket: 10, id_usuario: 99, estado: "Abierto" }]]);

        await expect(detalleService.obtenerDetalle("10", cliente)).rejects.toMatchObject({ status: 404 });

        expect(pool.query).toHaveBeenCalledTimes(1);
    });
});
