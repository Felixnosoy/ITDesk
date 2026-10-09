// HU26.5: el usuario de la aplicacion (itdesk_app_prueba, creado con la
// misma matriz que el de produccion) no puede cambiar la estructura de la
// base ni borrar o editar el historial. Que la aplicacion funcione completa
// con este usuario lo prueban el resto de las pruebas de integracion, que
// corren todas con el.
const { pool } = require("./apoyo");

afterAll(async () => {
    await pool.end();
});

// MySQL y MariaDB responden "command denied" (ER_TABLEACCESS_DENIED_ERROR
// o ER_DBACCESS_DENIED_ERROR) cuando falta el privilegio
const DENEGADO = /denied/i;

const intentar = async (sql) => {
    try {
        await pool.query(sql);
        return null;
    } catch (error) {
        return error;
    }
};

test("las pruebas corren con el usuario restringido", async () => {
    const [[{ usuario }]] = await pool.query("SELECT CURRENT_USER() AS usuario");

    expect(usuario).toMatch(/^itdesk_app_prueba@/);
});

describe("no puede cambiar la estructura de la base", () => {
    test.each([
        ["DROP TABLE", "DROP TABLE auditoria"],
        ["ALTER TABLE", "ALTER TABLE ticket ADD COLUMN prueba INT"],
        ["CREATE TABLE", "CREATE TABLE intrusa (id INT)"],
        ["TRUNCATE", "TRUNCATE TABLE nota_privada"],
        ["CREATE USER", "CREATE USER 'intruso'@'%' IDENTIFIED BY 'clave-larga-123'"]
    ])("%s se rechaza", async (_nombre, sql) => {
        const error = await intentar(sql);

        expect(error).not.toBeNull();
        expect(error.message).toMatch(DENEGADO);
    });

    test("las tablas siguen intactas despues de los intentos", async () => {
        const [[{ cantidad }]] = await pool.query("SELECT COUNT(*) AS cantidad FROM auditoria");
        const [columnas] = await pool.query("SHOW COLUMNS FROM ticket LIKE 'prueba'");

        expect(cantidad).toBeGreaterThanOrEqual(0);
        expect(columnas).toHaveLength(0);
    });
});

describe("no puede borrar ni editar el historial", () => {
    test.each([
        ["borrar tickets", "DELETE FROM ticket"],
        ["borrar usuarios", "DELETE FROM usuario"],
        ["borrar facturas", "DELETE FROM factura"],
        ["editar la auditoria", "UPDATE auditoria SET descripcion = 'alterada'"],
        ["borrar la auditoria", "DELETE FROM auditoria"],
        ["editar la linea de tiempo", "UPDATE actualizacion SET observaciones = 'alterada'"],
        ["editar lineas de una factura", "UPDATE factura_linea SET importe = 0"]
    ])("%s se rechaza", async (_nombre, sql) => {
        const error = await intentar(sql);

        expect(error).not.toBeNull();
        expect(error.message).toMatch(DENEGADO);
    });
});

describe("si puede hacer lo que la aplicacion necesita", () => {
    test("leer y actualizar un ticket", async () => {
        const [[ticket]] = await pool.query("SELECT id_ticket, titulo FROM ticket LIMIT 1");
        const [resultado] = await pool.query("UPDATE ticket SET titulo = ? WHERE id_ticket = ?", [ticket.titulo, ticket.id_ticket]);

        expect(resultado.affectedRows).toBe(1);
    });

    test("agregar una entrada a la auditoria", async () => {
        const [[usuario]] = await pool.query("SELECT id_usuario FROM usuario LIMIT 1");
        const [resultado] = await pool.query(
            "INSERT INTO auditoria (id_usuario, accion, descripcion) VALUES (?, 'PRUEBA_PRIVILEGIOS', 'Entrada de prueba de privilegios.')",
            [usuario.id_usuario]
        );

        expect(resultado.insertId).toBeGreaterThan(0);
    });

    test("no ve otras bases del servidor", async () => {
        const [bases] = await pool.query("SHOW DATABASES");
        const nombres = bases.map((fila) => Object.values(fila)[0]);

        expect(nombres).not.toContain("mysql");
    });
});
