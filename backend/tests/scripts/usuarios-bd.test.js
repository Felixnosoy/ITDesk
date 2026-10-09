const { sentenciasUsuario, diferenciasConLaMatriz, aplicarUsuarios, ocultarClaves } = require("../../scripts/usuarios-bd");
const { PRIVILEGIOS_APP } = require("../../scripts/privilegios");

const app = { base: "itdesk", usuario: "itdesk_app", host: "%", clave: "clave-de-prueba" };

describe("scripts/usuarios-bd", () => {
    test("por tabla: le quita todo al usuario y le da solo lo de cada tabla", () => {
        const sentencias = sentenciasUsuario({ ...app, privilegios: { ticket: ["SELECT", "UPDATE"], auditoria: ["SELECT", "INSERT"] } });

        expect(sentencias).toEqual([
            "CREATE USER IF NOT EXISTS 'itdesk_app'@'%' IDENTIFIED BY 'clave-de-prueba'",
            "ALTER USER 'itdesk_app'@'%' IDENTIFIED BY 'clave-de-prueba'",
            "REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'itdesk_app'@'%'",
            "GRANT SELECT, UPDATE ON `itdesk`.`ticket` TO 'itdesk_app'@'%'",
            "GRANT SELECT, INSERT ON `itdesk`.`auditoria` TO 'itdesk_app'@'%'"
        ]);
    });

    test("para toda la base: un solo GRANT sobre la base, nunca *.*", () => {
        const sentencias = sentenciasUsuario({ ...app, usuario: "itdesk_admin", privilegios: ["CREATE", "ALTER"] });

        expect(sentencias.at(-1)).toBe("GRANT CREATE, ALTER ON `itdesk`.* TO 'itdesk_admin'@'%'");
        expect(sentencias.join(" ")).not.toContain("*.*");
    });

    test("escapa nombres y claves con comillas", () => {
        const [crear] = sentenciasUsuario({ ...app, base: "it`desk", clave: "a'b", privilegios: [] });

        expect(crear).toBe("CREATE USER IF NOT EXISTS 'itdesk_app'@'%' IDENTIFIED BY 'a\\'b'");
        expect(sentenciasUsuario({ ...app, base: "it`desk", privilegios: ["SELECT"] }).at(-1)).toContain("`it``desk`.*");
    });

    test("oculta las claves al mostrar el SQL", () => {
        expect(ocultarClaves("CREATE USER 'u'@'%' IDENTIFIED BY 'a\\'b secreta'")).toBe("CREATE USER 'u'@'%' IDENTIFIED BY '********'");
    });

    test("detecta tablas sin privilegios y tablas de la matriz que no existen", () => {
        const tablas = [...Object.keys(PRIVILEGIOS_APP).filter((t) => t !== "factura"), "tabla_nueva"];

        expect(diferenciasConLaMatriz(tablas)).toEqual({ sinPrivilegios: ["tabla_nueva"], inexistentes: ["factura"] });
    });

    test("no toca ningun usuario si la base no coincide con la matriz", async () => {
        const conexion = { query: jest.fn().mockResolvedValueOnce([[{ tabla: "tabla_nueva" }]]) };

        await expect(aplicarUsuarios(conexion, { base: "itdesk", app }))
            .rejects.toThrow(/tabla_nueva/);
        expect(conexion.query).toHaveBeenCalledTimes(1);
    });
});
