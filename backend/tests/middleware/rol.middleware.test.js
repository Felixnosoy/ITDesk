const verificarRol = require("../../src/middleware/rol.middleware");

describe("rol.middleware.verificarRol", () => {
    const ejecutar = (rolUsuario, ...permitidos) => {
        const next = jest.fn();
        verificarRol(...permitidos)({ usuario: { rol: rolUsuario } }, {}, next);
        return next;
    };

    test("deja pasar si el rol esta entre los permitidos", () => {
        const next = ejecutar("Administrador", "Administrador", "Recepcionista");

        expect(next).toHaveBeenCalledWith();
    });

    test("responde 403 si el rol no esta entre los permitidos", () => {
        const next = ejecutar("Cliente", "Administrador", "Recepcionista");

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
    });

    test("la comparacion es exacta: 'administrador' en minuscula no cuenta", () => {
        const next = ejecutar("administrador", "Administrador");

        expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
    });
});
