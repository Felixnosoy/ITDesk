const pool = require("../config/database")
const crearError = require("../utils/crearError");
const { verificarTecnicoExiste } = require("../validators/usuario.validator");

const crearEspecialidad = async (datos) => {
    const { nombre } = datos;

    if (!nombre || !nombre.trim()) {
        throw crearError("El nombre de la especialidad es requerido.", 400);
    }

    const nombreNormalizado = nombre.trim();

    const [existentes] = await pool.query(
        "SELECT id_especialidad FROM especialidad WHERE nombre = ?",
        [nombreNormalizado]
    );

    if (existentes.length > 0) {
        throw crearError("Ya existe una especialidad con ese nombre.", 409);
    }

    const [resultado] = await pool.query(
        "INSERT INTO especialidad (nombre) VALUES (?)",
        [nombreNormalizado]
    );

    return obtenerEspecialidadPorId(resultado.insertId);
}

const obtenerEspecialidades = async () => {
    const [especialidades] = await pool.query(
        `
        SELECT id_especialidad, nombre, fecha_creacion
        FROM especialidad
        ORDER BY nombre ASC
        `
    );

    return especialidades;
}

const obtenerEspecialidadPorId = async (id) => {
    const [especialidades] = await pool.query(
        `
        SELECT id_especialidad, nombre, fecha_creacion
        FROM especialidad
        WHERE id_especialidad = ?
        `,
        [id]
    );

    if (especialidades.length === 0) {
        throw crearError("Especialidad no encontrada", 404);
    }

    return especialidades[0];
}

const actualizarEspecialidad = async (id, datos) => {
    const { nombre } = datos;

    if (!nombre || !nombre.trim()) {
        throw crearError("El nombre de la especialidad es requerido.", 400);
    }

    const nombreNormalizado = nombre.trim();

    await obtenerEspecialidadPorId(id);

    const [enUso] = await pool.query(
        "SELECT id_especialidad FROM especialidad WHERE nombre = ? AND id_especialidad != ?",
        [nombreNormalizado, id]
    );

    if (enUso.length > 0) {
        throw crearError("Ya existe una especialidad con ese nombre.", 409);
    }

    await pool.query(
        "UPDATE especialidad SET nombre = ? WHERE id_especialidad = ?",
        [nombreNormalizado, id]
    );

    return obtenerEspecialidadPorId(id);
}

const eliminarEspecialidad = async (id) => {
    await obtenerEspecialidadPorId(id);

    const [tecnicosConEsaEspecialidad] = await pool.query(
        "SELECT id_tecnico_especialidad FROM tecnico_especialidad WHERE id_especialidad = ? LIMIT 1",
        [id]
    );

    if (tecnicosConEsaEspecialidad.length > 0) {
        throw crearError("No se puede eliminar: hay técnicos con esta especialidad asignada.", 409);
    }

    await pool.query("DELETE FROM especialidad WHERE id_especialidad = ?", [id]);
}

// especialidades de un tecnico puntual (usadas tanto en su perfil como en
// la asignacion de visitas tecnicas)
const obtenerEspecialidadesDeTecnico = async (id_usuario) => {
    await verificarTecnicoExiste(id_usuario);

    const [especialidades] = await pool.query(
        `
        SELECT e.id_especialidad, e.nombre
        FROM tecnico_especialidad te
        INNER JOIN especialidad e
            ON te.id_especialidad = e.id_especialidad
        WHERE te.id_usuario = ?
        ORDER BY e.nombre ASC
        `,
        [id_usuario]
    );

    return especialidades;
}

// reemplaza el set completo de especialidades de un tecnico (whitelist,
// mismo espiritu que actualizarPerfilPropio: se manda la lista final, no
// se agrega/quita de a una)
const asignarEspecialidadesTecnico = async (id_usuario, especialidades) => {
    await verificarTecnicoExiste(id_usuario);

    if (!Array.isArray(especialidades)) {
        throw crearError("El campo especialidades debe ser un arreglo de ids.", 400);
    }

    const idsUnicos = [...new Set(especialidades.map(Number))]
        .filter((id) => Number.isInteger(id) && id > 0);

    if (idsUnicos.length > 0) {
        const placeholders = idsUnicos.map(() => "?").join(", ");
        const [existentes] = await pool.query(
            `SELECT id_especialidad FROM especialidad WHERE id_especialidad IN (${placeholders})`,
            idsUnicos
        );

        if (existentes.length !== idsUnicos.length) {
            throw crearError("Una o más especialidades indicadas no existen.", 400);
        }
    }

    await pool.query("DELETE FROM tecnico_especialidad WHERE id_usuario = ?", [id_usuario]);

    if (idsUnicos.length > 0) {
        const valores = idsUnicos.map((idEspecialidad) => [id_usuario, idEspecialidad]);
        await pool.query(
            "INSERT INTO tecnico_especialidad (id_usuario, id_especialidad) VALUES ?",
            [valores]
        );
    }

    return obtenerEspecialidadesDeTecnico(id_usuario);
}

module.exports = {
    crearEspecialidad,
    obtenerEspecialidades,
    obtenerEspecialidadPorId,
    actualizarEspecialidad,
    eliminarEspecialidad,
    obtenerEspecialidadesDeTecnico,
    asignarEspecialidadesTecnico
}
