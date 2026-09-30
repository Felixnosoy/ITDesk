// Catalogos del ticket. Los valores tienen que ser exactamente los que guarda
// el backend (sin tildes, igual que los roles), porque se comparan como string
// en los filtros; lo que ve el usuario sale de las etiquetas.
export const ESTADOS_TICKET = {
    ABIERTO: "Abierto",
    EN_DIAGNOSTICO: "En diagnostico",
    ESPERANDO_APROBACION: "Esperando aprobacion",
    EN_REPARACION: "En reparacion",
    RESUELTO: "Resuelto",
    CERRADO: "Cerrado",
};

export const PRIORIDADES = {
    BAJA: "Baja",
    MEDIA: "Media",
    ALTA: "Alta",
};

export const CATEGORIAS = {
    HARDWARE: "Hardware",
    SOFTWARE: "Software",
    RED: "Red",
    OTRO: "Otro",
};

export const ETIQUETA_ESTADO = {
    [ESTADOS_TICKET.ABIERTO]: "Abierto",
    [ESTADOS_TICKET.EN_DIAGNOSTICO]: "En diagnóstico",
    [ESTADOS_TICKET.ESPERANDO_APROBACION]: "Esperando aprobación",
    [ESTADOS_TICKET.EN_REPARACION]: "En reparación",
    [ESTADOS_TICKET.RESUELTO]: "Resuelto",
    [ESTADOS_TICKET.CERRADO]: "Cerrado",
};

export const ETIQUETA_PRIORIDAD = {
    [PRIORIDADES.BAJA]: "Baja",
    [PRIORIDADES.MEDIA]: "Media",
    [PRIORIDADES.ALTA]: "Alta",
};

export const ETIQUETA_CATEGORIA = {
    [CATEGORIAS.HARDWARE]: "Hardware",
    [CATEGORIAS.SOFTWARE]: "Software",
    [CATEGORIAS.RED]: "Red",
    [CATEGORIAS.OTRO]: "Otro",
};

// Estado inicial del panel de filtros del listado: sin ningun filtro aplicado.
export const FILTROS_VACIOS = { busqueda: "", estado: "", categoria: "", prioridad: "" };
