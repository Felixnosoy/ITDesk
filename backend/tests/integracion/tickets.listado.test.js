// HU09.6: alcance del listado segun el rol y filtros por estado,
// prioridad y categoria, contra la API y la base reales.
const { iniciarApi, pool } = require("./apoyo");

let api;

beforeAll(async () => {
    api = await iniciarApi();
});

afterAll(async () => {
    await api.cerrar();
});

const ids = (tickets) => tickets.map((t) => t.id_ticket).sort((a, b) => a - b);

// lo que deberia devolver el listado, consultado directo en la base
const esperados = async (condicion = "1 = 1", parametros = []) => {
    const [filas] = await pool.query(
        `SELECT t.id_ticket FROM ticket t INNER JOIN usuario c ON t.id_usuario = c.id_usuario WHERE ${condicion}`,
        parametros
    );
    return filas.map((f) => f.id_ticket).sort((a, b) => a - b);
};

describe("alcance del listado segun el rol", () => {
    test("sin sesion responde 401", async () => {
        const { status } = await api.pedir("GET", "/tickets");

        expect(status).toBe(401);
    });

    test.each(["cliente", "maria"])("el cliente %s ve solo sus propios tickets", async (cuenta) => {
        const { status, body } = await api.pedir("GET", "/tickets", api.tokens[cuenta]);
        const correo = cuenta === "cliente" ? "cliente.prueba@itdesk.test" : "maria.gomez@correo.test";

        expect(status).toBe(200);
        expect(body.data.length).toBeGreaterThan(0);
        expect(ids(body.data)).toEqual(await esperados("c.correo = ?", [correo]));
    });

    test("los dos clientes no comparten ningun ticket", async () => {
        const uno = await api.pedir("GET", "/tickets", api.tokens.cliente);
        const otro = await api.pedir("GET", "/tickets", api.tokens.maria);
        const comunes = ids(uno.body.data).filter((id) => ids(otro.body.data).includes(id));

        expect(comunes).toEqual([]);
    });

    test.each(["tecnico", "administrador", "recepcionista"])("%s ve todos los tickets del taller", async (cuenta) => {
        const { body } = await api.pedir("GET", "/tickets", api.tokens[cuenta]);

        expect(ids(body.data)).toEqual(await esperados());
    });

    test("cada ticket trae cliente, equipo y tecnico, y nunca datos sensibles", async () => {
        const { body } = await api.pedir("GET", "/tickets", api.tokens.tecnico);

        for (const ticket of body.data) {
            expect(ticket).toEqual(expect.objectContaining({
                cliente: expect.any(String),
                equipo_marca: expect.any(String),
                tecnico: expect.any(String)
            }));
            expect(JSON.stringify(ticket)).not.toMatch(/contraseña|\$2b\$/);
        }
    });

    test("viene ordenado del mas reciente al mas viejo", async () => {
        const { body } = await api.pedir("GET", "/tickets", api.tokens.administrador);
        const fechas = body.data.map((t) => new Date(t.fecha_apertura).getTime());

        expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
    });
});

describe("filtros del listado", () => {
    test.each([
        ["estado", ["Abierto", "En diagnostico", "Esperando aprobacion", "En reparacion", "Resuelto", "Cerrado"]],
        ["prioridad", ["Baja", "Media", "Alta"]],
        ["categoria", ["Hardware", "Software", "Red", "Otro"]]
    ])("cada valor de %s devuelve exactamente su subconjunto", async (filtro, valores) => {
        for (const valor of valores) {
            const { status, body } = await api.pedir("GET", `/tickets?${filtro}=${encodeURIComponent(valor)}`, api.tokens.tecnico);

            expect(status).toBe(200);
            expect(body.data.every((t) => t[filtro] === valor)).toBe(true);
            expect(ids(body.data)).toEqual(await esperados(`t.${filtro} = ?`, [valor]));
        }
    });

    test("los filtros se combinan", async () => {
        const { body } = await api.pedir("GET", "/tickets?prioridad=Alta&categoria=Hardware", api.tokens.administrador);

        expect(ids(body.data)).toEqual(await esperados("t.prioridad = 'Alta' AND t.categoria = 'Hardware'"));
    });

    test("un filtro no amplia el alcance del cliente", async () => {
        const { body } = await api.pedir("GET", "/tickets?prioridad=Alta", api.tokens.maria);

        expect(ids(body.data)).toEqual(await esperados("c.correo = 'maria.gomez@correo.test' AND t.prioridad = 'Alta'"));
    });

    test("un filtro vacio no filtra", async () => {
        const { body } = await api.pedir("GET", "/tickets?estado=&prioridad=", api.tokens.tecnico);

        expect(ids(body.data)).toEqual(await esperados());
    });

    test.each([
        ["un estado inexistente", "estado=Pausado"],
        ["un valor con otra capitalizacion", "prioridad=alta"],
        ["un intento de inyeccion", `categoria=${encodeURIComponent("' OR 1=1 --")}`],
        ["un parametro repetido", "estado=Abierto&estado=Cerrado"]
    ])("%s responde 400 con los valores permitidos", async (caso, consulta) => {
        const { status, body } = await api.pedir("GET", `/tickets?${consulta}`, api.tokens.cliente);

        expect(status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.message).toMatch(/Debe ser uno de/);
    });
});
