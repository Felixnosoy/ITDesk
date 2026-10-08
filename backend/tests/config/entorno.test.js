const { problemasDeEntorno, validarEntorno, opcionesCors } = require("../../src/config/entorno");

const DESARROLLO = {
    DB_HOST: "localhost",
    DB_USER: "root",
    DB_PASSWORD: "",
    DB_NAME: "itdesk",
    JWT_SECRET: "secreto-local"
};

const PRODUCCION = {
    NODE_ENV: "production",
    DB_HOST: "db.ejemplo.com",
    DB_USER: "itdesk_app",
    DB_PASSWORD: "clave-larga",
    DB_NAME: "itdesk",
    JWT_SECRET: "x".repeat(32),
    CORS_ORIGINS: "https://itdesk.onrender.com"
};

describe("config/entorno", () => {
    test("en desarrollo acepta root sin clave y CORS abierto", () => {
        expect(problemasDeEntorno(DESARROLLO)).toEqual([]);
        expect(opcionesCors(DESARROLLO)).toEqual({ origin: true });
    });

    test("una configuracion de produccion completa no tiene problemas", () => {
        expect(problemasDeEntorno(PRODUCCION)).toEqual([]);
        expect(() => validarEntorno(PRODUCCION)).not.toThrow();
    });

    test("junta todas las variables que faltan en un solo mensaje", () => {
        expect(() => validarEntorno({})).toThrow(/DB_HOST[\s\S]*DB_USER[\s\S]*DB_NAME[\s\S]*JWT_SECRET/);
    });

    test.each([
        ["un secreto corto", { JWT_SECRET: "corto" }, "JWT_SECRET"],
        ["sin CORS_ORIGINS", { CORS_ORIGINS: "" }, "CORS_ORIGINS"],
        ["CORS a localhost", { CORS_ORIGINS: "http://localhost:5173" }, "localhost"],
        ["la base sin clave", { DB_PASSWORD: "" }, "DB_PASSWORD"],
        ["el usuario root", { DB_USER: "root" }, "root"]
    ])("en produccion rechaza %s", (_caso, cambio, texto) => {
        const problemas = problemasDeEntorno({ ...PRODUCCION, ...cambio });

        expect(problemas.join(" ")).toContain(texto);
    });

    test("rechaza un origen con ruta o sin protocolo", () => {
        expect(problemasDeEntorno({ ...DESARROLLO, CORS_ORIGINS: "itdesk.com" })).toHaveLength(1);
        expect(problemasDeEntorno({ ...DESARROLLO, CORS_ORIGINS: "https://itdesk.com/app" })).toHaveLength(1);
    });

    test("CORS de produccion permite solo los origenes indicados, sin la barra final", () => {
        const opciones = opcionesCors({ ...PRODUCCION, CORS_ORIGINS: "https://a.com/, https://b.com" });

        expect(opciones).toEqual({ origin: ["https://a.com", "https://b.com"] });
    });
});
