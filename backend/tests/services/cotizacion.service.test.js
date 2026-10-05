jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const cotizacionService = require("../../src/services/cotizacion.service");

const tecnico = { id_usuario: 3, rol: "Tecnico" };
const ticket = (estado = "En diagnostico") => [[{ id_ticket: 10, id_usuario: 5, estado }]];
const diagnostico = [[{ id_diagnostico: 1, id_ticket: 10 }]];

const lineasValidas = [
    { descripcion: "Placa madre", cantidad: 2, precio_unitario: 1500.5 },
    { descripcion: "Mano de obra", cantidad: 1, precio_unitario: "999.99" }
];

// respuestas de crearCotizacion hasta el INSERT de la cotizacion
const hastaInsertar = ({ vigente = [] } = {}) => {
    pool.query
        .mockResolvedValueOnce(ticket())
        .mockResolvedValueOnce(diagnostico)
        .mockResolvedValueOnce([[]])               // SELECT ... FOR UPDATE
        .mockResolvedValueOnce([vigente]);
};

const sqlDe = (texto) => pool.query.mock.calls.find(([sql]) => sql.includes(texto));

describe("cotizacion.service.crearCotizacion (validaciones)", () => {
    test.each([
        ["sin lineas", undefined, "al menos una línea"],
        ["con lineas vacias", [], "al menos una línea"],
        ["una linea sin descripcion", [{ cantidad: 1, precio_unitario: 10 }], "descripcion de la línea 1"],
        ["cantidad 0", [{ descripcion: "x", cantidad: 0, precio_unitario: 10 }], "cantidad de la línea 1"],
        ["cantidad decimal", [{ descripcion: "x", cantidad: 1.5, precio_unitario: 10 }], "cantidad de la línea 1"],
        ["precio negativo", [{ descripcion: "x", cantidad: 1, precio_unitario: -5 }], "precio_unitario de la línea 1"],
        ["precio con 3 decimales", [{ descripcion: "x", cantidad: 1, precio_unitario: 1.234 }], "precio_unitario de la línea 1"],
        ["precio como texto", [...lineasValidas, { descripcion: "x", cantidad: 1, precio_unitario: "mil" }], "precio_unitario de la línea 3"]
    ])("rechaza con 400 %s sin consultar la base", async (_caso, lineas, mensaje) => {
        await expect(cotizacionService.crearCotizacion("10", { lineas }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining(mensaje) });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza mas de 30 lineas", async () => {
        const lineas = Array.from({ length: 31 }, () => ({ descripcion: "x", cantidad: 1, precio_unitario: 1 }));

        await expect(cotizacionService.crearCotizacion("10", { lineas }, tecnico))
            .rejects.toMatchObject({ status: 400 });
    });

    test("sin diagnostico responde 400 y no abre transaccion", async () => {
        pool.query
            .mockResolvedValueOnce(ticket())
            .mockResolvedValueOnce([[]]);

        await expect(cotizacionService.crearCotizacion("10", { lineas: lineasValidas }, tecnico))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("diagnóstico") });

        expect(pool.getConnection).not.toHaveBeenCalled();
    });

    test.each(["Resuelto", "Cerrado"])("un ticket %s ya no se cotiza", async (estado) => {
        pool.query.mockResolvedValueOnce(ticket(estado));

        await expect(cotizacionService.crearCotizacion("10", { lineas: lineasValidas }, tecnico))
            .rejects.toMatchObject({ status: 400 });
    });

    test("con otra cotizacion pendiente responde 409 y deshace", async () => {
        hastaInsertar({ vigente: [{ id_cotizacion: 4, estado: "Pendiente" }] });

        await expect(cotizacionService.crearCotizacion("10", { lineas: lineasValidas }, tecnico))
            .rejects.toMatchObject({ status: 409, message: expect.stringContaining("pendiente") });

        expect(pool.conexion.rollback).toHaveBeenCalled();
        expect(pool.conexion.commit).not.toHaveBeenCalled();
    });
});

describe("cotizacion.service.crearCotizacion (guardado)", () => {
    const crear = async (datos) => {
        hastaInsertar();
        pool.query
            .mockResolvedValueOnce([{ insertId: 7 }])   // INSERT cotizacion
            .mockResolvedValueOnce([{}])                // INSERT lineas
            .mockResolvedValueOnce([{}])                // UPDATE ticket
            .mockResolvedValueOnce([{}])                // INSERT actualizacion
            .mockResolvedValueOnce([[{ id_cotizacion: 7, id_ticket: 10, total: "4721.17", subtotal: "4000.99", itbis: "720.18" }]])
            .mockResolvedValueOnce([[{ id_linea: 1, id_cotizacion: 7, precio_unitario: "1500.50", importe: "3001.00" }]]);

        return cotizacionService.crearCotizacion("10", datos, tecnico);
    };

    test("calcula importes, subtotal, ITBIS y total en el servidor", async () => {
        await crear({ lineas: lineasValidas });

        const [, insertCotizacion] = sqlDe("INSERT INTO cotizacion ");
        // id_ticket, id_usuario, estado, subtotal, itbis, total, observaciones
        expect(insertCotizacion).toEqual([10, 3, "Pendiente", 4000.99, 720.18, 4721.17, null]);

        const [, [filas]] = sqlDe("INSERT INTO cotizacion_linea");
        expect(filas).toEqual([
            [7, "Placa madre", 2, 1500.5, 3001],
            [7, "Mano de obra", 1, 999.99, 999.99]
        ]);
    });

    test("ignora importes y totales que mande el cliente", async () => {
        await crear({
            lineas: [{ descripcion: "x", cantidad: 3, precio_unitario: 0.1, importe: 1 }],
            total: 1
        });

        const [, insertCotizacion] = sqlDe("INSERT INTO cotizacion ");
        // 3 x 0.10 = 0.30 exacto (sin el 0.30000000000000004 de punto flotante)
        expect(insertCotizacion.slice(3, 6)).toEqual([0.3, 0.05, 0.35]);
    });

    test("pasa el ticket a Esperando aprobacion y lo deja en la linea de tiempo", async () => {
        await crear({ lineas: lineasValidas });

        expect(sqlDe("UPDATE ticket SET estado")[1]).toEqual(["Esperando aprobacion", 10]);
        expect(sqlDe("INSERT INTO actualizacion")[1]).toEqual([10, 3, "Estado", "Esperando aprobacion", expect.any(String)]);
        expect(pool.conexion.commit).toHaveBeenCalled();
    });

    test("devuelve los montos como numeros y con sus lineas", async () => {
        const cotizacion = await crear({ lineas: lineasValidas });

        expect(cotizacion.total).toBe(4721.17);
        expect(cotizacion.lineas[0].importe).toBe(3001);
    });
});

describe("cotizacion.service.listarCotizaciones", () => {
    test("un cliente no ve las cotizaciones de un ticket ajeno", async () => {
        pool.query.mockResolvedValueOnce(ticket());

        await expect(cotizacionService.listarCotizaciones("10", { id_usuario: 99, rol: "Cliente" }))
            .rejects.toMatchObject({ status: 404 });
    });

    test("sin cotizaciones no busca lineas", async () => {
        pool.query
            .mockResolvedValueOnce(ticket())
            .mockResolvedValueOnce([[]]);

        await expect(cotizacionService.listarCotizaciones("10", tecnico)).resolves.toEqual([]);
        expect(pool.query).toHaveBeenCalledTimes(2);
    });
});
