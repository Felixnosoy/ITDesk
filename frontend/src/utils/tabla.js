// Ayudantes de orden y paginacion para las tablas. Son funciones puras para
// que la pantalla decida si ordena en el navegador o si le pide al backend
// que lo haga: en ambos casos el estado del orden tiene la misma forma.

export const FILAS_POR_PAGINA = 10;

// Al hacer clic en la misma columna se invierte la direccion; en una columna
// nueva se empieza siempre ascendente.
export const siguienteOrden = (ordenActual, columna) => {
    if (ordenActual?.columna === columna) {
        return { columna, direccion: ordenActual.direccion === "asc" ? "desc" : "asc" };
    }
    return { columna, direccion: "asc" };
};

// comparacion en espanol, sin distinguir mayusculas ni tildes y con numeros
// dentro del texto en orden natural (TK-2 antes que TK-10)
const comparador = new Intl.Collator("es", { sensitivity: "base", numeric: true });

const comparar = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return comparador.compare(String(a), String(b));
};

// Ordena sin modificar el arreglo original. Cada columna puede traer su
// propio valorOrden (por ejemplo, la prioridad se ordena por gravedad y no
// por orden alfabetico). Los vacios quedan siempre al final.
export const ordenarFilas = (filas, columnas, orden) => {
    if (!orden) return filas;
    const columna = columnas.find((c) => c.clave === orden.columna);
    if (!columna) return filas;

    const valorDe = columna.valorOrden ?? ((fila) => fila[columna.clave]);
    const signo = orden.direccion === "desc" ? -1 : 1;

    return [...filas].sort((filaA, filaB) => {
        const a = valorDe(filaA);
        const b = valorDe(filaB);
        const aVacio = a === null || a === undefined || a === "";
        const bVacio = b === null || b === undefined || b === "";
        if (aVacio || bVacio) return aVacio === bVacio ? 0 : aVacio ? 1 : -1;
        return comparar(a, b) * signo;
    });
};

export const totalPaginas = (cantidad, porPagina = FILAS_POR_PAGINA) =>
    Math.max(1, Math.ceil(cantidad / porPagina));

export const paginar = (filas, pagina, porPagina = FILAS_POR_PAGINA) =>
    filas.slice((pagina - 1) * porPagina, pagina * porPagina);
