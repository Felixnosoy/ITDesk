const pool = require("../config/database");
const crearError = require("../utils/crearError");
const ROLES = require("../constants/roles");
const ESTADOS_USUARIO = require("../constants/estadosUsuario");
const { validarId, validarTexto, validarTextoOpcional, validarBooleanoOpcional, validarFechaOpcional } = require("../validators/comun.validator");

const COLUMNAS_EQUIPO = `
    id_equipo,
    id_usuario,
    tipo,
    marca,
    modelo,
    numero_serie,
    sistema_operativo,
    procesador,
    memoria_ram,
    almacenamiento,
    color,
    en_garantia,
    garantia_vence,
    codigo_activo,
    estado,
    observaciones,
    fecha_registro
`;

// Busca el cliente y devuelve su estado; 404 si el id no es de un Cliente,
// asi no se pueden colgar equipos de un tecnico o de un administrador.
const obtenerCliente = async (id_cliente) => {
    const [clientes] = await pool.query(
        `
        SELECT id_usuario, estado
        FROM usuario
        WHERE id_usuario = ?
        AND rol = ?
        `,
        [id_cliente, ROLES.CLIENTE]
    );

    if (clientes.length === 0) {
        throw crearError("El cliente no existe.", 404);
    }

    return clientes[0];
};

// Equipos de un cliente, del mas reciente al mas viejo, para elegir uno al
// registrar un ticket a su nombre.
const obtenerEquiposDeCliente = async (idCliente) => {
    const id_cliente = validarId(idCliente, "id_cliente");

    await obtenerCliente(id_cliente);

    const [equipos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_EQUIPO}
        FROM equipo
        WHERE id_usuario = ?
        ORDER BY fecha_registro DESC, id_equipo DESC
        `,
        [id_cliente]
    );

    return equipos;
};

// Registra un equipo a nombre de un cliente activo. El numero de serie es
// unico en todo el taller: repetido responde 409.
const crearEquipo = async (datos = {}) => {
    const id_cliente = validarId(datos.id_cliente, "id_cliente");
    const tipo = validarTexto(datos.tipo, "tipo", 50);
    const marca = validarTexto(datos.marca, "marca", 50);
    const modelo = validarTexto(datos.modelo, "modelo", 50);
    const numero_serie = validarTexto(datos.numero_serie, "numero_serie", 100);
    const observaciones = validarTextoOpcional(datos.observaciones, "observaciones");
    // especificaciones y garantia: opcionales, con el largo de su columna
    const ficha = {
        sistema_operativo: validarTextoOpcional(datos.sistema_operativo, "sistema_operativo", 60),
        procesador: validarTextoOpcional(datos.procesador, "procesador", 80),
        memoria_ram: validarTextoOpcional(datos.memoria_ram, "memoria_ram", 30),
        almacenamiento: validarTextoOpcional(datos.almacenamiento, "almacenamiento", 60),
        color: validarTextoOpcional(datos.color, "color", 30),
        en_garantia: validarBooleanoOpcional(datos.en_garantia, "en_garantia") ?? 0,
        garantia_vence: validarFechaOpcional(datos.garantia_vence, "garantia_vence"),
        codigo_activo: validarTextoOpcional(datos.codigo_activo, "codigo_activo", 50),
    };

    // sin garantia no tiene sentido una fecha de vencimiento
    if (!ficha.en_garantia) ficha.garantia_vence = null;

    const cliente = await obtenerCliente(id_cliente);

    if (cliente.estado !== ESTADOS_USUARIO.ACTIVO) {
        throw crearError("El cliente está inactivo.", 400);
    }

    const [serieExiste] = await pool.query(
        "SELECT id_equipo FROM equipo WHERE numero_serie = ?",
        [numero_serie]
    );

    if (serieExiste.length > 0) {
        throw crearError("Ya hay un equipo registrado con ese número de serie.", 409);
    }

    let resultado;

    try {
        [resultado] = await pool.query(
            `
            INSERT INTO equipo (
                id_usuario, tipo, marca, modelo, numero_serie, observaciones,
                sistema_operativo, procesador, memoria_ram, almacenamiento, color,
                en_garantia, garantia_vence, codigo_activo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                id_cliente, tipo, marca, modelo, numero_serie, observaciones,
                ficha.sistema_operativo, ficha.procesador, ficha.memoria_ram, ficha.almacenamiento, ficha.color,
                ficha.en_garantia, ficha.garantia_vence, ficha.codigo_activo
            ]
        );
    } catch (error) {
        // dos registros con la misma serie al mismo tiempo: el SELECT de
        // arriba no alcanza a verlo, lo frena el UNIQUE de la tabla
        if (error.code === "ER_DUP_ENTRY") {
            throw crearError("Ya hay un equipo registrado con ese número de serie.", 409);
        }
        throw error;
    }

    const [equipos] = await pool.query(
        `
        SELECT
            ${COLUMNAS_EQUIPO}
        FROM equipo
        WHERE id_equipo = ?
        `,
        [resultado.insertId]
    );

    return equipos[0];
};

module.exports = {
    obtenerEquiposDeCliente,
    crearEquipo
};
