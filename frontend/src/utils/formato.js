// Codigo visible del ticket: el id con ceros a la izquierda (TK-0008), asi
// se lee y se dicta mejor que un numero suelto.
export const codigoTicket = (id) => `TK-${String(id).padStart(4, "0")}`;

// mismo criterio para el numero de factura (FAC-0004)
export const codigoFactura = (id) => `FAC-${String(id).padStart(4, "0")}`;

const FORMATO_FECHA = new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" });
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

export const formatearFecha = (valor) => (valor ? FORMATO_FECHA.format(new Date(valor)) : "—");

export const formatearFechaHora = (valor) => (valor ? FORMATO_FECHA_HORA.format(new Date(valor)) : "—");

// pesos dominicanos con dos decimales: RD$7,080.59
const FORMATO_MONTO = new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export const formatearMonto = (valor) => FORMATO_MONTO.format(Number(valor) || 0);

export const nombreEquipo = (ticket) =>
    [ticket.equipo_tipo, ticket.equipo_marca, ticket.equipo_modelo].filter(Boolean).join(" ");

// busqueda sin distinguir mayusculas ni tildes
export const normalizar = (texto) =>
    String(texto ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

// el valor guardado no lleva tilde
export const etiquetaDocumento = (tipo) => (tipo === "Cedula" ? "Cédula" : tipo);
