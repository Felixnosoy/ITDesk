jest.mock("../../src/config/database");
jest.mock("bcrypt");

const pool = require("../../src/config/database");
const bcrypt = require("bcrypt");
const usuarioService = require("../../src/services/usuario.service");

describe("usuario.service.crearUsuario", () => {
    const datos = {
        nombre: "Beto",
        apellido: "Blanco",
        correo: "beto@itdesk.com",
        "contraseña": "clave12345",
        rol: "Cliente",
        tipo_documento: "Cedula",
        num_documento: "001-0000001-1",
        estado: "Activo"
    };

    test("rechaza con 409 si el correo ya esta registrado", async () => {
        pool.query.mockResolvedValueOnce([[{ id_usuario: 5 }]]); // SELECT por correo

        await expect(usuarioService.crearUsuario(datos))
            .rejects.toMatchObject({ status: 409, message: expect.stringContaining("correo") });

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test("rechaza con 409 si el numero de documento ya esta registrado", async () => {
        pool.query
            .mockResolvedValueOnce([[]])              // SELECT por correo: libre
            .mockResolvedValueOnce([[{ id_usuario: 5 }]]); // SELECT por documento: ocupado

        await expect(usuarioService.crearUsuario(datos))
            .rejects.toMatchObject({ status: 409, message: expect.stringContaining("documento") });
    });

    test("con datos validos: hashea la contraseña antes de guardarla y nunca la texto plano", async () => {
        pool.query
            .mockResolvedValueOnce([[]])                      // correo libre
            .mockResolvedValueOnce([[]])                      // documento libre
            .mockResolvedValueOnce([{ insertId: 42 }])        // INSERT
            .mockResolvedValueOnce([[{ id_usuario: 42, nombre: "Beto" }]]); // SELECT final

        bcrypt.hash.mockResolvedValueOnce("hash-de-la-clave");

        const usuario = await usuarioService.crearUsuario(datos);

        expect(bcrypt.hash).toHaveBeenCalledWith("clave12345", 10);
        expect(usuario.id_usuario).toBe(42);

        // el INSERT (tercera llamada a pool.query) debe llevar el hash, no la clave real
        const argsInsert = pool.query.mock.calls[2][1];
        expect(argsInsert).toContain("hash-de-la-clave");
        expect(argsInsert).not.toContain("clave12345");
    });
});

describe("usuario.service.cambiarContrasena (self-service)", () => {
    test("rechaza si falta la contraseña actual o la nueva", async () => {
        await expect(usuarioService.cambiarContrasena(1, "", "nuevaClave123"))
            .rejects.toMatchObject({ status: 400 });
    });

    test("rechaza si la nueva contraseña tiene menos de 8 caracteres", async () => {
        await expect(usuarioService.cambiarContrasena(1, "actual123", "corta"))
            .rejects.toMatchObject({ status: 400, message: expect.stringContaining("8 caracteres") });

        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza con 400 si la contraseña actual no coincide con el hash guardado", async () => {
        pool.query.mockResolvedValueOnce([[{ "contraseña": "hash-guardado" }]]);
        bcrypt.compare.mockResolvedValueOnce(false);

        await expect(usuarioService.cambiarContrasena(1, "actualIncorrecta", "nuevaClave123"))
            .rejects.toMatchObject({ status: 400, message: "La contraseña actual no es correcta." });

        expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    test("con la contraseña actual correcta: hashea y guarda la nueva", async () => {
        pool.query
            .mockResolvedValueOnce([[{ "contraseña": "hash-guardado" }]]) // SELECT
            .mockResolvedValueOnce([{}]);                                  // UPDATE

        bcrypt.compare.mockResolvedValueOnce(true);
        bcrypt.hash.mockResolvedValueOnce("hash-nuevo");

        await usuarioService.cambiarContrasena(1, "actualCorrecta", "nuevaClave123");

        expect(bcrypt.hash).toHaveBeenCalledWith("nuevaClave123", 10);
        const argsUpdate = pool.query.mock.calls[1][1];
        expect(argsUpdate).toContain("hash-nuevo");
    });
});

describe("usuario.service.resetearContrasena (Admin, sin conocer la actual)", () => {
    test("rechaza si la nueva contraseña es demasiado corta", async () => {
        pool.query.mockResolvedValueOnce([[{ id_usuario: 1 }]]); // verificarUsuarioExiste

        await expect(usuarioService.resetearContrasena(1, "1234"))
            .rejects.toMatchObject({ status: 400 });
    });

    test("rechaza con 404 si el usuario no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]); // verificarUsuarioExiste: no encontrado

        await expect(usuarioService.resetearContrasena(999, "claveValida123"))
            .rejects.toMatchObject({ status: 404 });
    });

    test("con datos validos: actualiza sin pedir la contraseña anterior", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 1 }]]) // verificarUsuarioExiste
            .mockResolvedValueOnce([{}]);                  // UPDATE

        bcrypt.hash.mockResolvedValueOnce("hash-reseteado");

        await usuarioService.resetearContrasena(1, "claveValida123");

        expect(bcrypt.hash).toHaveBeenCalledWith("claveValida123", 10);
    });
});

describe("usuario.service.actualizarEstadoUsuario", () => {
    test("rechaza un estado que no sea Activo/Inactivo", async () => {
        pool.query.mockResolvedValueOnce([[{ id_usuario: 1 }]]); // verificarUsuarioExiste

        await expect(usuarioService.actualizarEstadoUsuario(1, "Suspendido"))
            .rejects.toMatchObject({ status: 400, message: "Estado inválido" });
    });

    test("acepta el estado sin importar mayusculas/minusculas y lo normaliza (Title Case)", async () => {
        pool.query
            .mockResolvedValueOnce([[{ id_usuario: 1 }]])              // verificarUsuarioExiste
            .mockResolvedValueOnce([{}])                                // UPDATE
            .mockResolvedValueOnce([[{ id_usuario: 1, estado: "Inactivo" }]]); // SELECT final

        await usuarioService.actualizarEstadoUsuario(1, "inactivo");

        const argsUpdate = pool.query.mock.calls[1][1];
        expect(argsUpdate[0]).toBe("Inactivo");
    });
});
