// Espejo de backend/src/constants/roles.js — mismos valores exactos,
// porque viajan tal cual en el JWT y se comparan como string.
export const ROLES = {
    ADMINISTRADOR: "Administrador",
    TECNICO: "Tecnico",
    CLIENTE: "Cliente",
    RECEPCIONISTA: "Recepcionista",
};

export const TODOS_LOS_ROLES = Object.values(ROLES);

// Nombre para mostrar en pantalla: el valor guardado no lleva tilde.
export const ETIQUETA_ROL = {
    [ROLES.ADMINISTRADOR]: "Administrador",
    [ROLES.TECNICO]: "Técnico",
    [ROLES.CLIENTE]: "Cliente",
    [ROLES.RECEPCIONISTA]: "Recepcionista",
};
