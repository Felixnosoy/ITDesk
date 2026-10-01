jest.mock("../../src/config/database");

const pool = require("../../src/config/database");
const archivoService = require("../../src/services/archivo.service");

const archivo = (bytes, nombre = "foto.png", mimetype = "image/png") =>
    ({ originalname: nombre, mimetype, size: bytes.length, buffer: Buffer.from(bytes) });

describe("archivo.service.validarImagenes", () => {
    test.each([
        ["png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1], "image/png", ".png"],
        ["jpg", [0xff, 0xd8, 0xff, 0xe0, 1], "image/jpeg", ".jpg"],
        ["gif", [...Buffer.from("GIF89a")], "image/gif", ".gif"],
        ["webp", [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")], "image/webp", ".webp"]
    ])("reconoce %s por su contenido", (nombre, bytes, tipo, extension) => {
        const [imagen] = archivoService.validarImagenes([archivo(bytes, "x", "image/png")]);

        expect(imagen.tipo_mime).toBe(tipo);
        expect(imagen.extension).toBe(extension);
    });

    test("rechaza un archivo que dice ser imagen pero no lo es", () => {
        expect(() => archivoService.validarImagenes([archivo([...Buffer.from("<script>")], "x.png")]))
            .toThrow(expect.objectContaining({ status: 400 }));
    });

    test("se queda solo con el nombre del archivo, sin rutas", () => {
        const [imagen] = archivoService.validarImagenes([archivo([0xff, 0xd8, 0xff], "../../etc/foto.jpg")]);

        expect(imagen.nombre_original).toBe("foto.jpg");
    });
});

describe("archivo.service.obtenerArchivoParaDescarga", () => {
    const fila = (id_actualizacion, id_cliente = 5) =>
        [[{ nombre_original: "a.png", nombre_archivo: "uuid.png", tipo_mime: "image/png", id_actualizacion, id_cliente }]];

    test("el personal descarga un adjunto privado", async () => {
        pool.query.mockResolvedValueOnce(fila(null));

        const resultado = await archivoService.obtenerArchivoParaDescarga("1", { id_usuario: 3, rol: "Recepcionista" });

        expect(resultado.ruta).toMatch(/uploads[\\/]uuid\.png$/);
    });

    test("el cliente dueño descarga un adjunto publico", async () => {
        pool.query.mockResolvedValueOnce(fila(8));

        await expect(archivoService.obtenerArchivoParaDescarga("1", { id_usuario: 5, rol: "Cliente" }))
            .resolves.toMatchObject({ tipo_mime: "image/png" });
    });

    test.each([
        ["privado de su propio ticket", null, 5],
        ["publico de un ticket ajeno", 8, 6]
    ])("el cliente recibe 404 para un adjunto %s", async (caso, id_actualizacion, id_cliente) => {
        pool.query.mockResolvedValueOnce(fila(id_actualizacion, id_cliente));

        await expect(archivoService.obtenerArchivoParaDescarga("1", { id_usuario: 5, rol: "Cliente" }))
            .rejects.toMatchObject({ status: 404 });
    });
});
