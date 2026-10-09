const responder = require("../../src/utils/respuesta");

const respuestaFalsa = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

describe("utils/respuesta", () => {
    const entornoOriginal = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = entornoOriginal;
        jest.restoreAllMocks();
    });

    test("en produccion un 500 no devuelve el mensaje original", () => {
        process.env.NODE_ENV = "production";
        jest.spyOn(console, "error").mockImplementation(() => {});
        const res = respuestaFalsa();

        responder(res, 500, { message: "INSERT command denied to user 'itdesk_app'" });

        expect(res.json.mock.calls[0][0].message).not.toContain("itdesk_app");
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("itdesk_app"));
    });

    test("en produccion los errores previstos (400, 404, 503) conservan su mensaje", () => {
        process.env.NODE_ENV = "production";

        for (const status of [400, 404, 503]) {
            const res = respuestaFalsa();
            responder(res, status, { message: "Mensaje para el usuario" });
            expect(res.json.mock.calls[0][0].message).toBe("Mensaje para el usuario");
        }
    });

    test("en desarrollo un 500 muestra el mensaje original para depurar", () => {
        process.env.NODE_ENV = "development";
        const res = respuestaFalsa();

        responder(res, 500, { message: "detalle" });

        expect(res.json.mock.calls[0][0]).toEqual({ success: false, message: "detalle" });
    });
});
