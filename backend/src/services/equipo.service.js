const pool = require("../config/database")
const crearError = require("../utils/crearError");
const { verificarClienteExiste, verificarUsuarioExiste } = require("../validators/usuario.validator");

// TODO: extraer las validaciones manuales de este service a una capa de
// validadores dedicada en una futura refactorización.

const COLUMNAS_EQUIPO = `
    e.id_equipo,
    e.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS cliente,
    e.tipo,
    e.marca,
    e.modelo,
    e.numero_serie,
    e.estado,
    e.fecha_registro,
    e.observaciones
`;

const crearEquipo = async (datos) => {
    const {
        id_usuario,
        tipo,
        marca,
        modelo,
        numero_serie,
        estado,
        observaciones
    } = datos;

    if (
        !id_usuario ||
        !tipo ||
        !marca ||
        !modelo ||
        !numero_serie ||
        !estado
    ) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const tipoNormalizado = tipo.trim();
    const marcaNormalizada = marca.trim();
    const modeloNormalizado = modelo.trim();
    const numeroSerieNormalizado = numero_serie.trim().toUpperCase();
    const estadoNormalizado = estado.trim();
    const observacionesNormalizadas = observaciones?.trim() || null;

    await verificarClienteExiste(id_usuario);

    // Verificar que el número de serie no exista
    const [equiposExistentes] = await pool.query(
        `
        SELECT id_equipo
        FROM equipo
        WHERE numero_serie = ?
        `,
        [numeroSerieNormalizado]
    );

    if (equiposExistentes.length > 0) {
        throw crearError("Ya existe un equipo con ese número de serie.", 409);
    }

    // Insertar equipo
    const [resultado] = await pool.query(
        `
        INSERT INTO equipo (
            id_usuario,
            tipo,
            marca,
            modelo,
            numero_serie,
            estado,
            observaciones
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            id_usuario,
            tipoNormalizado,
            marcaNormalizada,
            modeloNormalizado,
            numeroSerieNormalizado,
            estadoNormalizado,
            observacionesNormalizadas
        ]
    );

    // Obtener el equipo recién creado
    const [equipos] = await pool.query(
        `
        SELECT
            id_equipo,
            id_usuario,
            tipo,
            marca,
            modelo,
            numero_serie,
            estado,
            fecha_registro,
            observaciones
        FROM equipo
        WHERE id_equipo = ?
        `,
        [resultado.insertId]
    );

    return equipos[0];

}

//este get sirve para obtener todos los equipos en general registrados.

const obtenerEquipos = async () => {

    const [equipos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_EQUIPO}
        FROM equipo e
        INNER JOIN usuario u
            ON e.id_usuario = u.id_usuario
        ORDER BY e.id_equipo DESC
        `
    );

    return equipos;
}

// este get sirve para obtener un equipo en especifico por su id

const obtenerEquipoPorId = async (id) => {

    const [equipos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_EQUIPO}
        FROM equipo e
        INNER JOIN usuario u
            ON e.id_usuario = u.id_usuario
        WHERE e.id_equipo = ?
        `,
        [id]
    )

    if (equipos.length === 0) {
        throw crearError("Equipo no encontrado", 404);
    }

    return equipos[0];
}

// este get sirve para obtener todos los equipos de un usuario en especifico

const obtenerEquiposDeUsuarioPorId = async (id_usuario) => {

    await verificarUsuarioExiste(id_usuario, "El cliente no existe.");

    const [equipos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_EQUIPO}
        FROM equipo e
        INNER JOIN usuario u
            ON e.id_usuario = u.id_usuario
        WHERE e.id_usuario = ?
        ORDER BY e.id_equipo DESC
        `,
        [id_usuario]
    );

    return equipos;
}

const actualizarEquipo = async (id, nuevosDatos) => {

    const {
        tipo,
        marca,
        modelo,
        numero_serie,
        estado,
        observaciones
    } = nuevosDatos;

    if (
        !tipo ||
        !marca ||
        !modelo ||
        !numero_serie ||
        !estado
    ) {
        throw crearError("Todos los campos obligatorios son requeridos.", 400);
    }

    const tipoNormalizado = tipo.trim();
    const marcaNormalizada = marca.trim();
    const modeloNormalizado = modelo.trim();
    const numeroSerieNormalizado = numero_serie.trim().toUpperCase();
    const estadoNormalizado = estado.trim();
    const observacionesNormalizadas = observaciones?.trim() || null;

    // Verificar que el equipo exista
    const [equipoExistente] = await pool.query(
        "SELECT id_equipo FROM equipo WHERE id_equipo = ?",
        [id]
    );

    if (equipoExistente.length === 0) {
        throw crearError("Equipo no encontrado", 404);
    }

    // Verificar que el número de serie no esté en uso por otro equipo
    const [numeroSerieExiste] = await pool.query(
        "SELECT id_equipo FROM equipo WHERE numero_serie = ? AND id_equipo != ?",
        [numeroSerieNormalizado, id]
    );

    if (numeroSerieExiste.length > 0) {
        throw crearError("Ya existe un equipo con ese número de serie.", 409);
    }

    await pool.query(
        `
        UPDATE equipo
        SET
            tipo = ?,
            marca = ?,
            modelo = ?,
            numero_serie = ?,
            estado = ?,
            observaciones = ?
        WHERE id_equipo = ?
        `,
        [
            tipoNormalizado,
            marcaNormalizada,
            modeloNormalizado,
            numeroSerieNormalizado,
            estadoNormalizado,
            observacionesNormalizadas,
            id
        ]
    );

    const [equipos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_EQUIPO}
        FROM equipo e
        INNER JOIN usuario u
            ON e.id_usuario = u.id_usuario
        WHERE e.id_equipo = ?
        `,
        [id]
    );

    return equipos[0];
}

const eliminarEquipo = async (id) => {
    //verificar que el equipo exista

    await obtenerEquipoPorId(id)

    await pool.query(
        `
        DELETE FROM equipo
        WHERE id_equipo = ?
        `,
        [id]
    );
}

module.exports = {
    crearEquipo,
    obtenerEquipos,
    obtenerEquipoPorId,
    obtenerEquiposDeUsuarioPorId,
    actualizarEquipo,
    eliminarEquipo

}