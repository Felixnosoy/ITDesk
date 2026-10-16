const crearError = require("../utils/crearError");

// Convierte un id que llega del body o de la URL a numero. Rechaza texto,
// decimales, negativos y arreglos (?id=1&id=2) con 400 antes de llegar a
// la base, para que el error diga que campo esta mal.
const validarId = (valor, campo) => {
    const texto = typeof valor === "number" ? String(valor) : valor;

    if (typeof texto !== "string" || !/^[1-9]\d*$/.test(texto.trim())) {
        throw crearError(`El campo ${campo} es requerido y debe ser un id válido.`, 400);
    }

    return Number(texto.trim());
};

// Texto obligatorio: recortado, no vacio y sin pasar el largo de la columna
// (si no, MySQL lo cortaria o fallaria con un 500).
const validarTexto = (valor, campo, largoMaximo) => {
    if (typeof valor !== "string" || valor.trim() === "") {
        throw crearError(`El campo ${campo} es requerido.`, 400);
    }

    const texto = valor.trim();

    if (largoMaximo && texto.length > largoMaximo) {
        throw crearError(`El campo ${campo} admite como máximo ${largoMaximo} caracteres.`, 400);
    }

    return texto;
};

// Texto opcional: null si no viene o viene vacio.
const validarTextoOpcional = (valor, campo, largoMaximo) => {
    if (valor === undefined || valor === null || (typeof valor === "string" && valor.trim() === "")) {
        return null;
    }

    return validarTexto(valor, campo, largoMaximo);
};

// Si/no opcional: acepta true/false (JSON) o "1"/"0"/"true"/"false" (form).
// Devuelve 1, 0 o null si no vino, que es como lo guarda un tinyint.
const validarBooleanoOpcional = (valor, campo) => {
    if (valor === undefined || valor === null || valor === "") return null;
    if (valor === true || valor === "true" || valor === "1" || valor === 1) return 1;
    if (valor === false || valor === "false" || valor === "0" || valor === 0) return 0;

    throw crearError(`El campo ${campo} debe ser verdadero o falso.`, 400);
};

// Fecha opcional en formato AAAA-MM-DD (lo que manda un input type=date)
const validarFechaOpcional = (valor, campo) => {
    if (valor === undefined || valor === null || valor === "") return null;

    const fecha = typeof valor === "string" ? valor.trim() : "";
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const real = new Date(Date.UTC(anio, mes - 1, dia));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || real.getUTCMonth() !== mes - 1 || real.getUTCDate() !== dia) {
        throw crearError(`El campo ${campo} debe ser una fecha válida (AAAA-MM-DD).`, 400);
    }

    return fecha;
};

// Valor de un catalogo, opcional: null si no viene
const validarCatalogoOpcional = (valor, campo, catalogo) => {
    if (valor === undefined || valor === null || valor === "") return null;

    if (typeof valor !== "string" || !catalogo.includes(valor.trim())) {
        throw crearError(`El campo ${campo} debe ser uno de: ${catalogo.join(", ")}.`, 400);
    }

    return valor.trim();
};

module.exports = {
    validarId,
    validarTexto,
    validarTextoOpcional,
    validarBooleanoOpcional,
    validarFechaOpcional,
    validarCatalogoOpcional
};
