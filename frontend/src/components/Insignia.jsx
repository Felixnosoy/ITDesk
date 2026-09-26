import {
    ESTADOS_TICKET,
    PRIORIDADES,
    CATEGORIAS,
    ETIQUETA_ESTADO,
    ETIQUETA_PRIORIDAD,
    ETIQUETA_CATEGORIA,
} from "../constants/tickets";
import "./Insignia.css";

// Cada tipo asocia su valor con un tono de color. Los tonos se definen una
// sola vez en Insignia.css, asi la tabla, el detalle y el selector de estado
// muestran siempre el mismo color para el mismo valor.
const TIPOS = {
    estado: {
        etiquetas: ETIQUETA_ESTADO,
        tonos: {
            [ESTADOS_TICKET.ABIERTO]: "azul",
            [ESTADOS_TICKET.EN_DIAGNOSTICO]: "violeta",
            [ESTADOS_TICKET.ESPERANDO_APROBACION]: "ambar",
            [ESTADOS_TICKET.EN_REPARACION]: "acento",
            [ESTADOS_TICKET.RESUELTO]: "verde",
            [ESTADOS_TICKET.CERRADO]: "gris",
        },
    },
    prioridad: {
        etiquetas: ETIQUETA_PRIORIDAD,
        tonos: {
            [PRIORIDADES.BAJA]: "gris",
            [PRIORIDADES.MEDIA]: "ambar",
            [PRIORIDADES.ALTA]: "rojo",
        },
    },
    categoria: {
        etiquetas: ETIQUETA_CATEGORIA,
        // la categoria no expresa urgencia, por eso va en contorno y no en
        // relleno: asi no compite con el estado y la prioridad en la tabla
        contorno: true,
        tonos: {
            [CATEGORIAS.HARDWARE]: "azul",
            [CATEGORIAS.SOFTWARE]: "violeta",
            [CATEGORIAS.RED]: "acento",
            [CATEGORIAS.OTRO]: "gris",
        },
    },
};

// Un valor que no esta en el catalogo se muestra tal cual en gris, en vez de
// romper la pantalla, por si el backend agrega un valor antes que el frontend.
export default function Insignia({ tipo, valor }) {
    const config = TIPOS[tipo];
    const tono = config?.tonos[valor] ?? "gris";
    const texto = config?.etiquetas[valor] ?? valor;
    const clases = ["insignia", `insignia-${tono}`];
    if (config?.contorno) clases.push("insignia-contorno");

    return <span className={clases.join(" ")}>{texto}</span>;
}
