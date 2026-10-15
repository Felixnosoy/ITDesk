import { ROLES } from "./roles";

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

// Clase de la franja de color de cada prioridad (issue HU30.2); el color
// esta en index.css para que la tabla y el tablero usen el mismo.
export const CLASE_PRIORIDAD = {
    [PRIORIDADES.BAJA]: "prioridad-baja",
    [PRIORIDADES.MEDIA]: "prioridad-media",
    [PRIORIDADES.ALTA]: "prioridad-alta",
};

export const ETIQUETA_CATEGORIA = {
    [CATEGORIAS.HARDWARE]: "Hardware",
    [CATEGORIAS.SOFTWARE]: "Software",
    [CATEGORIAS.RED]: "Red",
    [CATEGORIAS.OTRO]: "Otro",
};

// Estado inicial del panel de filtros del listado: sin ningun filtro aplicado.
export const FILTROS_VACIOS = { busqueda: "", estado: "", categoria: "", prioridad: "" };

// Vistas rapidas del listado (issue HU30.1). Son atajos sobre los tickets ya
// cargados, no filtros del servidor: asi cada una muestra su cantidad sin
// pedir nada mas. "Mios" solo tiene sentido para el tecnico, que es a quien
// se asignan los tickets; el cliente no ve vistas porque su listado ya es
// solo suyo.
export const VISTA_TODOS = "todos";

export const VISTAS_TICKET = [
    {
        clave: "mios",
        etiqueta: "Míos",
        descripcion: "Tickets asignados a ti",
        roles: [ROLES.TECNICO],
        incluye: (ticket, usuario) => ticket.id_tecnico === usuario.id_usuario,
    },
    {
        clave: "esperan-cliente",
        etiqueta: "Esperan al cliente",
        descripcion: "Cotización por decidir o equipo listo para entregar",
        roles: [ROLES.TECNICO, ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR],
        incluye: (ticket) =>
            ticket.estado === ESTADOS_TICKET.ESPERANDO_APROBACION || ticket.estado === ESTADOS_TICKET.RESUELTO,
    },
    {
        clave: "para-facturar",
        etiqueta: "Para facturar",
        descripcion: "Cotización aprobada que todavía no tiene factura",
        roles: [ROLES.TECNICO, ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR],
        incluye: (ticket) => Boolean(ticket.por_facturar),
    },
    {
        clave: VISTA_TODOS,
        etiqueta: "Todos",
        descripcion: "Todos los tickets del taller",
        roles: [ROLES.TECNICO, ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR],
        incluye: () => true,
    },
];

export const vistasParaRol = (rol) => VISTAS_TICKET.filter((vista) => vista.roles.includes(rol));
