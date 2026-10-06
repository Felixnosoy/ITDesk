// Espejo de backend/src/utils/montos.js: misma formula y mismos limites, asi
// el total que ve el tecnico mientras escribe es exactamente el que va a
// guardar el servidor. Las cuentas van en centavos enteros para no arrastrar
// errores de punto flotante (0.1 + 0.2).

export const TASA_ITBIS = 0.18;
export const MAXIMO_LINEAS = 30;
export const MAXIMA_CANTIDAD = 999;
export const MAXIMO_PRECIO = 999999.99;

const aCentavos = (monto) => Math.round(Number(monto) * 100);

// mismas reglas que validarCantidad y validarPrecio del backend
export const cantidadValida = (texto) =>
    /^[1-9]\d*$/.test(String(texto).trim()) && Number(texto) <= MAXIMA_CANTIDAD;

export const precioValido = (texto) =>
    /^\d+(\.\d{1,2})?$/.test(String(texto).trim()) && Number(texto) <= MAXIMO_PRECIO;

// importe de una linea en centavos, o null si todavia no se puede calcular
export const importeCentavos = (linea) =>
    cantidadValida(linea.cantidad) && precioValido(linea.precio_unitario)
        ? Number(linea.cantidad) * aCentavos(linea.precio_unitario)
        : null;

// subtotal = suma de importes; ITBIS redondeado al centavo; total = ambos.
// Las lineas incompletas no suman, para que el total no salte a NaN.
export const calcularMontos = (lineas) => {
    const subtotal = lineas.reduce((suma, linea) => suma + (importeCentavos(linea) ?? 0), 0);
    const itbis = Math.round(subtotal * TASA_ITBIS);

    return {
        subtotal: subtotal / 100,
        itbis: itbis / 100,
        total: (subtotal + itbis) / 100,
    };
};
