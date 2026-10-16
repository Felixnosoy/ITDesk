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
        ruta: "/tickets",
        etiqueta: "Tickets",
        icono: "tickets",
        roles: TODOS_LOS_ROLES,
        descripcion: "Busca, filtra y abre los tickets del taller.",
    },
    {
        ruta: "/tickets/nuevo",
        etiqueta: "Registrar ticket",
        icono: "nuevo",
        roles: [ROLES.RECEPCIONISTA, ROLES.ADMINISTRADOR],
        descripcion: "Registra el problema de un cliente y asígnalo a un técnico.",
    },
    {
        ruta: "/usuarios",
        etiqueta: "Usuarios",
        icono: "usuarios",
        roles: [ROLES.ADMINISTRADOR],
        descripcion: "Crea, edita y desactiva las cuentas del sistema.",
    },
    {
        ruta: "/perfil",
        etiqueta: "Mi perfil",
        icono: "perfil",
        roles: TODOS_LOS_ROLES,
        descripcion: "Consulta tus datos y actualiza tu teléfono y dirección.",
    },
    {
        ruta: "/cambiar-contrasena",
        etiqueta: "Cambiar contraseña",
        icono: "llave",
        roles: TODOS_LOS_ROLES,
        descripcion: "Actualiza la contraseña con la que inicias sesión.",
    },
];

export const seccionesParaRol = (rol) =>
    SECCIONES.filter((seccion) => seccion.roles.includes(rol));

// Frase bajo el saludo del inicio de cada rol.
export const PANELES = {
    [ROLES.ADMINISTRADOR]: {
        titulo: "Panel de administración",
        resumen: "Así va el taller hoy: lo que está pendiente y lo que falta por cobrar.",
    },
    [ROLES.TECNICO]: {
        titulo: "Panel del técnico",
        resumen: "Tu cola de trabajo, empezando por lo que te toca.",
    },
    [ROLES.CLIENTE]: {
        titulo: "Panel del cliente",
        resumen: "Así van tus equipos en el taller.",
    },
    [ROLES.RECEPCIONISTA]: {
        titulo: "Panel de recepción",
        resumen: "Recibe equipos, registra tickets y entrega los que están listos.",
    },
};
