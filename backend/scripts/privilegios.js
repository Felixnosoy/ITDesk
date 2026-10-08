// Matriz de privilegios de la base de datos (issue HU26.1). Es la fuente
// de verdad: el script usuarios-bd.js la aplica tal cual y
// docs/privilegios-base-de-datos.md la explica.
//
// Usuario de la aplicacion: solo lo que el backend usa de verdad, tabla
// por tabla (se saco revisando cada consulta de src/). Ninguna tabla
// necesita DELETE: nada se borra, se desactiva o cambia de estado. Las
// tablas de historial (auditoria, actualizacion, notas, adjuntos, lineas)
// son de solo agregar: ni la propia aplicacion puede editarlas.
//
// Si un cambio del backend empieza a usar una operacion nueva sobre una
// tabla, o agrega una tabla, hay que sumarla aca y volver a correr
// npm run db:usuarios. El script se niega a correr si la base tiene una
// tabla que esta matriz no menciona, para que no se olvide.
const PRIVILEGIOS_APP = {
    usuario: ["SELECT", "INSERT", "UPDATE"],
    auditoria: ["SELECT", "INSERT"],
    equipo: ["SELECT", "INSERT"],
    ticket: ["SELECT", "INSERT", "UPDATE"],
    asignacion: ["SELECT", "INSERT"],
    actualizacion: ["SELECT", "INSERT"],
    nota_privada: ["SELECT", "INSERT"],
    archivo_adjunto: ["SELECT", "INSERT"],
    diagnostico: ["SELECT", "INSERT", "UPDATE"],
    cotizacion: ["SELECT", "INSERT", "UPDATE"],
    cotizacion_linea: ["SELECT", "INSERT"],
    factura: ["SELECT", "INSERT", "UPDATE"],
    factura_linea: ["SELECT", "INSERT"]
};

// Usuario de administracion: crea y cambia la estructura (correr
// schema.sql, ALTER TABLE de cada sprint, cargar datos). Todo sobre esta
// base y nada global: no puede crear usuarios, ver otras bases ni dar
// permisos a otros (sin GRANT OPTION).
const PRIVILEGIOS_ADMIN = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "DROP",
    "ALTER",
    "INDEX",
    "REFERENCES",
    "CREATE VIEW",
    "SHOW VIEW",
    "TRIGGER",
    "LOCK TABLES",
    "CREATE TEMPORARY TABLES"
];

module.exports = {
    PRIVILEGIOS_APP,
    PRIVILEGIOS_ADMIN
};
