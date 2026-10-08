// HU19.6: el endpoint de salud responde sin token y refleja la base
const { iniciarApi } = require("./apoyo");

let api;

beforeAll(async () => {
    api = await iniciarApi();
});

afterAll(async () => {
    await api.cerrar();
});

test("GET /health responde 200 sin token con la base disponible", async () => {
    const { status, body } = await api.pedir("GET", "/health");

    expect(status).toBe(200);
    expect(body.data).toEqual(expect.objectContaining({ estado: "ok", base_de_datos: "disponible" }));
});
