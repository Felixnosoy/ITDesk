jest.mock("../../src/config/database");
jest.mock("bcrypt");
jest.mock("jsonwebtoken");

// auth.service.js lee process.env.JWT_SECRET/JWT_EXPIRES_IN en el momento
// de firmar — ningun test carga el .env real (mockeamos database.js, que es
// el unico archivo que hace dotenv.config()), asi que se fijan acá para que
// el test sea autocontenido y no dependa del entorno de quien lo corra.
process.env.JWT_SECRET = "secreto-de-prueba";
process.env.JWT_EXPIRES_IN = "1h";

const pool = require("../../src/config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authService = require("../../src/services/auth.service");

// login es la puerta de entrada a todo el sistema — cualquier regresion
// aca (ej. un cambio futuro que rompa la comparacion de contraseña o el
// chequeo de usuario inactivo) bloquea a todo el mundo.
describe("auth.service.login", () => {
    const usuarioDB = {
        id_usuario: 1,
        nombre: "Ana",
        apellido: "Admin",
        correo: "ana@itdesk.com",
        contraseña: "hash-guardado-en-la-db",
        rol: "Administrador",
        estado: "Activo"
    };

    test("rechaza si falta el correo o la contraseña", async () => {
        await expect(authService.login("", "1234")).rejects.toMatchObject({ status: 400 });
        await expect(authService.login("ana@itdesk.com", "")).rejects.toMatchObject({ status: 400 });
        expect(pool.query).not.toHaveBeenCalled();
    });

    test("rechaza con 401 si el correo no existe", async () => {
        pool.query.mockResolvedValueOnce([[]]);

        await expect(authService.login("no-existe@itdesk.com", "1234"))
            .rejects.toMatchObject({ status: 401, message: "Correo o contraseña incorrectos" });
    });

    test("rechaza con 403 si el usuario existe pero esta Inactivo", async () => {
        pool.query.mockResolvedValueOnce([[{ ...usuarioDB, estado: "Inactivo" }]]);

        await expect(authService.login(usuarioDB.correo, "1234"))
            .rejects.toMatchObject({ status: 403 });

        // nunca deberia llegar a comparar la contraseña si ya esta inactivo
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("rechaza con 401 si la contraseña no coincide con el hash guardado", async () => {
        pool.query.mockResolvedValueOnce([[usuarioDB]]);
        bcrypt.compare.mockResolvedValueOnce(false);

        await expect(authService.login(usuarioDB.correo, "incorrecta"))
            .rejects.toMatchObject({ status: 401, message: "Correo o contraseña incorrectos" });
    });

    test("con credenciales correctas: firma un token y no expone el hash de la contraseña", async () => {
        pool.query.mockResolvedValueOnce([[usuarioDB]]);
        bcrypt.compare.mockResolvedValueOnce(true);
        jwt.sign.mockReturnValueOnce("token-falso-para-el-test");

        const resultado = await authService.login(usuarioDB.correo, "correcta");

        expect(resultado.token).toBe("token-falso-para-el-test");
        expect(resultado.usuario.correo).toBe(usuarioDB.correo);
        expect(resultado.usuario.contraseña).toBeUndefined();

        // el payload del JWT es lo unico que realmente importa verificar:
        // solo id_usuario + rol, nunca datos sensibles
        expect(jwt.sign).toHaveBeenCalledWith(
            { id_usuario: usuarioDB.id_usuario, rol: usuarioDB.rol },
            "secreto-de-prueba",
            { expiresIn: "1h" }
        );
    });
});
