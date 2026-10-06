const crearError = require("./crearError");
const { validarTexto } = require("../validators/comun.validator");

// Montos de cotizaciones y facturas. Las cuentas se hacen en centavos
// enteros para no arrastrar errores de punto flotante (0.1 + 0.2), y el
// total siempre lo calcula el servidor: lo que mande el frontend como
// importe o total se ignora.

const TASA_ITBIS = 0.18;
const MAXIMO_LINEAS = 30;
const MAXIMA_CANTIDAD = 999;
const MAXIMO_PRECIO = 999999.99;
// tope de decimal(10,2) en la base
const MAXIMO_TOTAL_CENTAVOS = 9999999999;

const aCentavos = (monto) => Math.round(Number(monto) * 100);
const aMonto = (centavos) => centavos / 100;

// Acepta 1500, 1500.5 o "1500.50"; nunca mas de dos decimales ni negativos.
const validarPrecio = (valor, campo) => {
    const texto = typeof valor === "number" ? String(valor) : valor;

    if (typeof texto !== "string" || !/^\d+(\.\d{1,2})?$/.test(texto.trim())) {
        throw crearError(`El campo ${campo} debe ser un monto mayor o igual a 0, con hasta 2 decimales.`, 400);
    }

    const precio = Number(texto.trim());

    if (precio > MAXIMO_PRECIO) {
        throw crearError(`El campo ${campo} no puede pasar de ${MAXIMO_PRECIO}.`, 400);
    }

    return precio;
};

const validarCantidad = (valor, campo) => {
    const texto = typeof valor === "number" ? String(valor) : valor;

    if (typeof texto !== "string" || !/^[1-9]\d*$/.test(texto.trim()) || Number(texto) > MAXIMA_CANTIDAD) {
        throw crearError(`El campo ${campo} debe ser un número entero entre 1 y ${MAXIMA_CANTIDAD}.`, 400);
    }

    return Number(texto.trim());
};

// Valida las lineas que manda el tecnico y les calcula el importe. Cada
// error dice en que linea esta (contando desde 1) para poder marcarla en
// el formulario.
const validarLineas = (lineas) => {
    if (!Array.isArray(lineas) || lineas.length === 0) {
        throw crearError("La cotización necesita al menos una línea.", 400);
    }

    if (lineas.length > MAXIMO_LINEAS) {
        throw crearError(`La cotización admite como máximo ${MAXIMO_LINEAS} líneas.`, 400);
    }

    return lineas.map((linea, i) => {
        const n = i + 1;

        if (!linea || typeof linea !== "object") {
            throw crearError(`La línea ${n} no es válida.`, 400);
        }

        const descripcion = validarTexto(linea.descripcion, `descripcion de la línea ${n}`, 255);
        const cantidad = validarCantidad(linea.cantidad, `cantidad de la línea ${n}`);
        const precio_unitario = validarPrecio(linea.precio_unitario, `precio_unitario de la línea ${n}`);

        return {
            descripcion,
            cantidad,
            precio_unitario,
            importe: aMonto(cantidad * aCentavos(precio_unitario))
        };
    });
};

// subtotal = suma de importes; ITBIS redondeado al centavo; total = ambos
const calcularMontos = (lineas) => {
    const subtotal = lineas.reduce((suma, linea) => suma + aCentavos(linea.importe), 0);
    const itbis = Math.round(subtotal * TASA_ITBIS);
    const total = subtotal + itbis;

    if (total > MAXIMO_TOTAL_CENTAVOS) {
        throw crearError("El total de la cotización es demasiado alto.", 400);
    }

    return {
        subtotal: aMonto(subtotal),
        itbis: aMonto(itbis),
        total: aMonto(total)
    };
};

// mysql2 devuelve las columnas DECIMAL como texto ("1500.00"); el frontend
// las recibe como numero para poder sumar y formatear sin convertir
const conMontosNumericos = (fila, campos) => {
    const copia = { ...fila };

    for (const campo of campos) {
        if (copia[campo] !== null && copia[campo] !== undefined) {
            copia[campo] = Number(copia[campo]);
        }
    }

    return copia;
};

module.exports = {
    TASA_ITBIS,
    validarLineas,
    calcularMontos,
    conMontosNumericos
};
