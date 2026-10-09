// HU26.3: la API de las pruebas corre con el usuario restringido, no root
const { pool } = require("./apoyo");

afterAll(async () => {
    await pool.end();
});

test("la API se conecta con el usuario de privilegios minimos", async () => {
    const [[{ usuario }]] = await pool.query("SELECT CURRENT_USER() AS usuario");

    expect(usuario).toMatch(/^itdesk_app_prueba@/);
});
