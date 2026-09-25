const jwt = require("jsonwebtoken");
const verificarToken = require("../../src/middleware/auth.middleware");

describe("auth.middleware.verificarToken", () => {
    const SECRETO = "secreto-solo-para-pruebas";
    let res;
    let next;

    beforeEach(() => {
        process.env.JWT_SECRET = SECRETO;
        res = {};
        next = jest.fn();
    });

    const pedir = (authorization) => {
        const req = { headers: authorization ? { authorization } : {} };
        verificarToken(req, res, next);
        return req;
    };

    test("sin encabezado Authorization responde 401", () => {
        pedir(undefined);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
    });

    test("con un formato distinto de 'Bearer <token>' responde 401", () => {
        pedir("Basic abc123");

        expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
    });

    test("con un token alterado o firmado con otro secreto responde 401", () => {
        const ajeno = jwt.sign({ id_usuario: 1, rol: "Administrador" }, "otro-secreto");

        pedir(`Bearer ${ajeno}`);

        expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
    });

    test("con un token vencido responde 401", () => {
        const vencido = jwt.sign({ id_usuario: 1, rol: "Cliente" }, SECRETO, { expiresIn: -10 });

        pedir(`Bearer ${vencido}`);

        expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
    });

    test("con un token valido deja pasar y expone id y rol en req.usuario", () => {
        const token = jwt.sign({ id_usuario: 7, rol: "Tecnico" }, SECRETO, { expiresIn: "1h" });

        const req = pedir(`Bearer ${token}`);

        expect(next).toHaveBeenCalledWith();
        expect(req.usuario).toMatchObject({ id_usuario: 7, rol: "Tecnico" });
    });
});
