const fs = require("fs");
const path = require("path");
const { PRIVILEGIOS_APP, PRIVILEGIOS_ADMIN } = require("../../scripts/privilegios");

const esquema = fs.readFileSync(path.join(__dirname, "..", "..", "..", "base de datos", "schema.sql"), "utf8");
const tablasDelEsquema = [...esquema.matchAll(/CREATE TABLE `(\w+)`/g)].map((m) => m[1]).sort();

describe("matriz de privilegios", () => {
    test("cubre exactamente las tablas de schema.sql", () => {
        expect(Object.keys(PRIVILEGIOS_APP).sort()).toEqual(tablasDelEsquema);
    });

    test("el usuario de la aplicacion no tiene operaciones de estructura ni DELETE", () => {
        const operaciones = new Set(Object.values(PRIVILEGIOS_APP).flat());

        expect([...operaciones].sort()).toEqual(["INSERT", "SELECT", "UPDATE"]);
    });

    test("el usuario de administracion no tiene permisos para dar permisos ni crear usuarios", () => {
        expect(PRIVILEGIOS_ADMIN).not.toEqual(expect.arrayContaining(["GRANT OPTION"]));
        expect(PRIVILEGIOS_ADMIN).not.toEqual(expect.arrayContaining(["CREATE USER"]));
        expect(PRIVILEGIOS_ADMIN).not.toEqual(expect.arrayContaining(["ALL PRIVILEGES"]));
    });
});
