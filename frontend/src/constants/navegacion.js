import { ROLES, TODOS_LOS_ROLES } from "./roles";

// Pantalla de inicio propia de cada rol: al iniciar sesion, cada uno aterriza
// en la suya.
export const RUTA_INICIO = {
    [ROLES.ADMINISTRADOR]: "/administrador",
    [ROLES.TECNICO]: "/tecnico",
    [ROLES.CLIENTE]: "/cliente",
    [ROLES.RECEPCIONISTA]: "/recepcion",
};

// Secciones del menu lateral, ademas del inicio de cada rol. El menu solo
// muestra las que el rol puede abrir; cada historia agrega las suyas aqui.
export const SECCIONES = [
    {
        ruta: "/perfil",
        etiqueta: "Mi perfil",
        icono: "perfil",
        roles: TODOS_LOS_ROLES,
        descripcion: "Consulta tus datos y actualiza tu teléfono y dirección.",
    },
];

export const seccionesParaRol = (rol) =>
    SECCIONES.filter((seccion) => seccion.roles.includes(rol));

// Contenido del panel de inicio de cada rol. "proximamente" lista lo que el
// rol va a tener a medida que avanzan los sprints (no son enlaces).
export const PANELES = {
    [ROLES.ADMINISTRADOR]: {
        titulo: "Panel de administración",
        resumen: "Desde aquí se controla quién tiene acceso al sistema y con qué rol.",
        proximamente: ["Reportes del taller", "Registro de auditoría"],
    },
    [ROLES.TECNICO]: {
        titulo: "Panel del técnico",
        resumen: "Tu espacio de trabajo dentro del taller.",
        proximamente: ["Cola de tickets", "Diagnósticos y cotizaciones"],
    },
    [ROLES.CLIENTE]: {
        titulo: "Panel del cliente",
        resumen: "Aquí seguirás el estado de tus equipos en el taller.",
        proximamente: ["Mis tickets", "Cotizaciones y facturas"],
    },
    [ROLES.RECEPCIONISTA]: {
        titulo: "Panel de recepción",
        resumen: "Tu espacio para recibir clientes y registrar sus casos.",
        proximamente: ["Registro de tickets", "Clientes y equipos"],
    },
};
