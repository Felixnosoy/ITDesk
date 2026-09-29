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

module.exports = {
    validarId,
    validarTexto,
    validarTextoOpcional
};
